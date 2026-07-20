from pydantic import BaseModel
from uuid import UUID


class ChatRequest(BaseModel):
    user_id: UUID
    conversation_id: UUID
    client: str
    message: str


class ChatResponse(BaseModel):
    response: str


