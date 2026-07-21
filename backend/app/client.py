import os
from abc import ABC, abstractmethod
from typing import Generator, List, Dict
from dotenv import load_dotenv
from groq import Groq
from google import genai

load_dotenv()


class Client(ABC):
    def __init__(self, api_key: str):
        self.api_key = api_key

    @abstractmethod
    def stream_response(self, messages: List[Dict[str, str]]) -> Generator[str, None, None]:
        pass


class GroqClient(Client):
    def __init__(self, api_key: str, model: str):
        super().__init__(api_key)
        self.model = model
        self.client = Groq(api_key=self.api_key)

    def stream_response(self, messages: List[Dict[str, str]]) -> Generator[str, None, None]:
        completion = self.client.chat.completions.create(
            messages=messages,
            model=self.model,
            stream=True 
        )
        for chunk in completion:
            content = chunk.choices[0].delta.content
            if content:
                yield content


class GeminiClient(Client):
    def __init__(self, api_key: str, model: str):
        super().__init__(api_key)
        self.model = model
        self.client = genai.Client(api_key=self.api_key)

    def stream_response(self, messages: List[Dict[str, str]]) -> Generator[str, None, None]:
        formatted_contents = []
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            
            formatted_contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })

        stream = self.client.models.generate_content_stream(
            model=self.model,
            contents=formatted_contents,
        )
        
        for chunk in stream:
            if chunk.text:
                yield chunk.text


class ClientFactory:
    @staticmethod
    def get_client(client_type: str) -> Client:
        client_type = client_type.lower()
        if client_type == "groq":
            api_key = os.getenv("GROQ_API_KEY")
            model = "llama-3.3-70b-versatile"
            if not api_key:
                raise ValueError("GROQ_API_KEY environment variable is not set.")
            return GroqClient(api_key, model)
        
        elif client_type == "gemini":
            api_key = os.getenv("GEMINI_API_KEY")
            model = "gemini-2.5-flash" 
            if not api_key:
                raise ValueError("GOOGLE_API_KEY environment variable is not set.")
            return GeminiClient(api_key, model)
            
        else:
            raise ValueError(f"Unknown client type: {client_type}")