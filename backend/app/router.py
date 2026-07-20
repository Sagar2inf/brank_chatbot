import json
from uuid import UUID
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.database import get_db, SessionLocal
from app.models import Base, User, Conversation, Message
from app.client import ClientFactory
from app.pii import redact_pii
from app.sdk import ObservabilityWrapper

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

def get_or_create_default_user(db: DBSession) -> User:
    user = db.query(User).first()
    if not user:
        user = User(username="default_user", password="nopassword")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.get("/sessions", response_model=List[SessionResponse])
async def list_conversations(db: DBSession = Depends(get_db)):
    conversations = db.query(Conversation).order_by(Conversation.created_at.desc()).all()
    return [{"session_id": str(c.id), "title": c.title} for c in conversations]

@router.post("/sessions", response_model=SessionResponse)
async def create_conversation(db: DBSession = Depends(get_db)):
    user = get_or_create_default_user(db)
    new_conv = Conversation(user_id=user.id, title="New Chat")
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    return {"session_id": str(new_conv.id), "title": new_conv.title}

@router.get("/sessions/{session_id}", response_model=List[ChatMessage])
async def resume_conversation(session_id: str, db: DBSession = Depends(get_db)):
    try:
        conv_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv_uuid)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in messages]



@router.websocket("/stream/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    db = SessionLocal() 
    
    try:
        conv_uuid = UUID(session_id)
        while True:
            payload = await websocket.receive_json()
            raw_message = payload.get("message")
            provider = payload.get("provider", "groq")

            if not raw_message:
                continue

            safe_message = redact_pii(raw_message)
            
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

            base_client = ClientFactory.get_client(provider)
            instrumented_client = ObservabilityWrapper(base_client, str(conv_uuid))
            
            full_assistant_response = ""
            
            async for token in instrumented_client.stream_and_log(chat_history):
                full_assistant_response += token
                await websocket.send_json({"type": "token", "content": token})

            new_assistant_msg = Message(
                conversation_id=conv_uuid,
                role="assistant",
                content=full_assistant_response
            )
            db.add(new_assistant_msg)
            db.commit()

            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        print(f"Client disconnected for session {session_id}")
    except Exception as e:
        print(f"Error streaming response: {e}")
        await websocket.send_json({"type": "error", "content": str(e)})
    finally:
        db.close()