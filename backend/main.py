import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base
from app.router import router as chat_router
from app.consumer import start_ingestion_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events.
    Auto-creates database tables when the app launches.
    """
    Base.metadata.create_all(bind=engine)
    print("Database ready!")
    worker_task = asyncio.create_task(start_ingestion_worker())
    print("Backend & Ingestion Worker are ready")
    yield
    print("Shutting down application...")

    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        print("Ingestion worker shut down gracefully.")
    

app = FastAPI(
    title="Inference Observability Chatbot Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api/chat")


@app.get("/")
def home():
    return {
        "status": "healthy",
        "service": "Inference Observability Backend",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )