import json
import asyncio
import os
import redis.asyncio as redis
from app.database import SessionLocal
from app.models import InferenceLog

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

async def ingestion_worker():
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("inference_logs")
        print("Ingestion worker successfully subscribed to 'inference_logs' queue...")

        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                
                db = SessionLocal()
                try:
                    log_entry = InferenceLog(
                        conversation_id=data.get("session_id"),
                        prompt_preview=data.get("prompt"),
                        response_preview=data.get("response"),
                        provider=data.get("provider"),
                        model=data.get("model"),
                        latency_ms=data.get("latency_ms"),
                        ttft_ms=data.get("ttft_ms"),
                        status=data.get("status")
                    )
                    db.add(log_entry)
                    db.commit()
                    print(f"Successfully saved inference log for session {data.get('session_id')[:8]}...")
                except Exception as db_err:
                    print(f"Database error in worker: {db_err}")
                    db.rollback()
                finally:
                    db.close()
                    
    except asyncio.CancelledError:
        print("Worker task was cancelled gracefully.")
    except Exception as e:
        print(f"Worker encountered a fatal error: {e}")