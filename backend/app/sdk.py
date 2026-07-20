import time
from typing import List, Dict
from app.client import Client
from app.producer import publish_inference_event 

class ObservabilityWrapper:
    """
    A lightweight SDK wrapper that auto-instruments LLM calls.
    Captures TTFT, latency, and token usage, then pushes to the ingestion pipeline.
    """
    
    def __init__(self, client: Client, session_id: str):
        self.client = client
        self.session_id = session_id
        self.provider = client.__class__.__name__.replace("Client", "").lower()
        self.model = getattr(client, "model", "unknown")

    async def stream_and_log(self, messages: List[Dict[str, str]]):
        start_time = time.time()
        ttft = None
        full_response = ""
        prompt = messages[-1]["content"] if messages else ""
        status = "success"

        try:
            for token in self.client.stream_response(messages):
                if ttft is None:
                    ttft = (time.time() - start_time) * 1000 
                
                full_response += token
                yield token  
                
        except Exception as e:
            status = f"error: {str(e)}"
            raise e
            
        finally:
            total_latency = (time.time() - start_time) * 1000
            
            await publish_inference_event({
                "session_id": self.session_id,
                "prompt": prompt,
                "response": full_response,
                "provider": self.provider,
                "model": self.model,
                "latency_ms": round(total_latency, 2),
                "ttft_ms": round(ttft or 0.0, 2),
                "status": status
            })