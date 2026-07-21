import time
from typing import List, Dict
from app.client import Client

class ObserverWrapper:
    """
    A lightweight SDK wrapper that auto-instruments LLM calls.
    Calculates TTFT, latency, and captures the response, but leaves logging to the router.
    """
    
    def __init__(self, client: Client, session_id: str):
        self.client = client
        self.session_id = session_id
        self.provider = client.__class__.__name__.replace("Client", "").lower()
        self.model = getattr(client, "model", "unknown")
        
        self.ttft_ms = 0.0
        self.latency_ms = 0.0
        self.full_response = ""

    async def stream(self, messages: List[Dict[str, str]]):
        start_time = time.time()
        ttft_captured = False

        try:
            for token in self.client.stream_response(messages):
                if not ttft_captured:
                    self.ttft_ms = (time.time() - start_time) * 1000 
                    ttft_captured = True
                
                self.full_response += token
                yield token  
                
        finally:
            self.latency_ms = (time.time() - start_time) * 1000