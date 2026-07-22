import json
import time
from uuid import UUID
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy.orm import Session as DBSession

from app.database import get_db, SessionLocal
from app.models import Base, User, Conversation, Message
from app.client import ClientFactory
from app.pii import redact_pii
from app.sdk import ObserverWrapper
from app.auth import get_current_user, get_current_user_ws
from app.producer import publish_inference_event

router = APIRouter(tags=["chat"])

class SessionResponse(BaseModel):
    session_id: str
    title: str
    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    role: str
    content: str
    class Config:
        from_attributes = True


@router.get("/sessions", response_model=List[SessionResponse])
async def list_conversations(db: DBSession = Depends(get_db), curr_user: User = Depends(get_current_user)):
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == curr_user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return [{"session_id": str(c.id), "title": c.title} for c in conversations]

@router.post("/sessions", response_model=SessionResponse)
async def create_conversation(db: DBSession = Depends(get_db), curr_user: User = Depends(get_current_user)):
    new_conv = Conversation(user_id=curr_user.id, title="New Chat")
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    return {"session_id": str(new_conv.id), "title": new_conv.title}

@router.get("/sessions/{session_id}", response_model=List[ChatMessage])
async def resume_conversation(session_id: str, db: DBSession = Depends(get_db), curr_user: User = Depends(get_current_user)):
    try:
        conv_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    conv = db.query(Conversation).filter(Conversation.id == conv_uuid).first()
    if not conv or conv.user_id != curr_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv_uuid)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in messages]


@router.websocket("/stream/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str, token: str = Query(...)):
    await websocket.accept()
    db = SessionLocal() 
    
    try:
        current_user = await get_current_user_ws(token, db)
        if not current_user:
            await websocket.send_json({"type": "error", "content": "Authentication failed"})
            await websocket.close(code=1008) 
            return

        conv_uuid = UUID(session_id)
        conv = db.query(Conversation).filter(Conversation.id == conv_uuid).first()
        
        if not conv or conv.user_id != current_user.id:
            await websocket.send_json({"type": "error", "content": "Conversation not found"})
            await websocket.close(code=1008)
            return

        while True:
            start_time = time.time()
            provider = "unknown"
            safe_message = ""
            sdk_client = None 
            
            try:
                payload = await websocket.receive_json()
                raw_message = payload.get("message")
                provider = payload.get("provider", "groq")

                if not raw_message:
                    continue

                safe_message = redact_pii(raw_message)
                
                try:
                    new_user_msg = Message(
                        conversation_id=conv_uuid,
                        role="user",
                        content=safe_message
                    )
                    db.add(new_user_msg)
                    db.commit()

                    db_messages = (
                        db.query(Message)
                        .filter(Message.conversation_id == conv_uuid)
                        .order_by(Message.created_at.asc())
                        .all()
                    )
                    chat_history = [{"role": m.role, "content": m.content} for m in db_messages]
                    
                    # check here for any problem for now
                    base_client = ClientFactory.get_client(provider)
                    sdk_client = ObserverWrapper(base_client, str(conv_uuid))
                    
                except Exception as setup_err:
                    await websocket.send_json({"type": "error", "content": "System error: Message dropped."})

                    try:
                        await publish_inference_event({
                            "session_id": str(conv_uuid),
                            "prompt": safe_message,
                            "response": getattr(sdk_client, 'full_response', ""),
                            "provider": getattr(sdk_client, 'provider', provider),
                            "model": getattr(sdk_client, 'model', "system"),
                            "latency_ms": round(getattr(sdk_client, 'latency_ms', 0.0), 2),
                            "ttft_ms": round(getattr(sdk_client, 'ttft_ms', 0.0), 2),
                            "status": f"dropped_pre_llm: {str(setup_err)}"
                        })
                    except Exception as log_err:
                        print(f"Telemetry Failed: {log_err}")

                    continue

                try:
                    async for chunk in sdk_client.stream(chat_history):
                        await websocket.send_json({"type": "token", "content": chunk})
                        
                except Exception as llm_err:
                    await websocket.send_json({"type": "error", "content": "AI Provider error."})

                    try:
                        await publish_inference_event({
                            "session_id": str(conv_uuid),
                            "prompt": safe_message,
                            "response": getattr(sdk_client, 'full_response', ""),
                            "provider": getattr(sdk_client, 'provider', provider),
                            "model": getattr(sdk_client, 'model', "Unknown"),
                            "latency_ms": round(getattr(sdk_client, 'latency_ms', 0.0), 2),
                            "ttft_ms": round(getattr(sdk_client, 'ttft_ms', 0.0), 2),
                            "status": f"llm_error: {str(llm_err)}"
                        })
                    except Exception as log_err:
                        print(f"Telemetry Failed: {log_err}")
                    continue

                try:
                    new_assistant_msg = Message(
                        conversation_id=conv_uuid,
                        role="assistant",
                        content=sdk_client.full_response
                    )
                    db.add(new_assistant_msg)
                    db.commit()
                    await websocket.send_json({"type": "done"})
                    
                    try:
                        await publish_inference_event({
                            "session_id": str(conv_uuid),
                            "prompt": safe_message,
                            "response": getattr(sdk_client, 'full_response', ""),
                            "provider": getattr(sdk_client, 'provider', provider),
                            "model": getattr(sdk_client, 'model', "Unknown"),
                            "latency_ms": round(getattr(sdk_client, 'latency_ms', 0.0), 2),
                            "ttft_ms": round(getattr(sdk_client, 'ttft_ms', 0.0), 2),
                            "status": "success"
                        })
                    except Exception as log_err:
                        print(f"Telemetry Failed: {log_err}")
                    
                except Exception as save_err:
                    await websocket.send_json({"type": "error", "content": "unable to save message and response"})
                    try:
                        await publish_inference_event({
                            "session_id": str(conv_uuid),
                            "prompt": safe_message,
                            "response": getattr(sdk_client, 'full_response', ""),
                            "provider": getattr(sdk_client, 'provider', provider),
                            "model": getattr(sdk_client, 'model', "Unknown"),
                            "latency_ms": round(getattr(sdk_client, 'latency_ms', 0.0), 2),
                            "ttft_ms": round(getattr(sdk_client, 'ttft_ms', 0.0), 2),
                            "status": f"dropped_post_llm: {str(save_err)}"
                        })
                    except Exception as log_err:
                        print(f"Telemetry Failed: {log_err}")

            except WebSocketDisconnect:
                print(f"Client disconnected for session {session_id}")
                break
                
    except Exception as e:
        print(f"Fatal connection error: {e}")
    finally:
        db.close()