import os
import json
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

redis_client = redis.from_url(REDIS_URL, decode_responses=True)

async def publish_inference_event(payload: dict):
    """
    Publishes inference metadata to a Redis pub/sub channel.
    This acts as the start of the asynchronous ingestion pipeline,
    decoupling the logging mechanism from the user's chat stream.
    """
    try:
        channel_name = "inference_logs"
        message = json.dumps(payload)
        
        await redis_client.publish(channel_name, message)
        
    except Exception as e:
        print(f"Failed to publish inference event to Redis: {e}")