# Brank Chatbot Observability Assignment

A full-stack, event-driven AI chatbot application featuring real-time telemetry, PII redaction, and a high-performance ingestion pipeline.

## 🏗️ Architecture Overview

This project is designed with scalability and decoupling in mind. Instead of blocking the user interface with database I/O, we use an asynchronous event-based architecture.

## 🏗️ Architecture Overview

The system follows an asynchronous, event-driven design to decouple chat processing from telemetry ingestion, ensuring high performance and data reliability.
```
    User[User] --> UI[Frontend: React/Vite]
    UI --> WS[WebSocket: FastAPI]
    WS --> LLM[LLM Provider: Groq/Gemini]
    
    subgraph Ingestion Pipeline
    LLM --> SDK[SDK Wrapper]
    SDK -- "Pub (Event)" --> Redis[(Redis Queue)]
    Redis -- "Sub (Background)" --> Worker[Ingestion Worker]
    Worker --> DB[(PostgreSQL)]
    end
    
    DB --> Grafana[Grafana Dashboard]
```
    

1.  **Frontend (React + Vite):** A responsive UI that communicates via WebSockets for real-time streaming.
2.  **Backend (FastAPI):** Orchestrates communication between LLM providers (Groq/Gemini).
3.  **Ingestion Pipeline:**
    *   **SDK/Wrapper:** Intercepts LLM calls, calculates latency/tokens, and produces an event to Redis.
    *   **Worker:** A background consumer process listens to the Redis Pub/Sub queue and asynchronously writes data to PostgreSQL.
4.  **Observability:** Grafana connected to PostgreSQL, providing real-time metrics on Latency, Throughput, and Error rates.

## 🚀 Key Features

*   **Event-Based Architecture:** Telemetry data is ingested via a Redis queue, ensuring zero latency impact on the user's chat experience.
*   **Factory Pattern:** Modular provider support (Groq/Gemini), making it easy to swap LLM backends.
*   **Data Security:** Automatic PII redaction and logging of preview data for auditing.
*   **Real-time Observability:** Built-in dashboard for monitoring request metrics and system health.
*   **Deployment-Ready:** Fully containerized with `docker-compose`, supporting one-command deployment.

## 📦 Getting Started

### Prerequisites
*   Docker & Docker Compose installed.

### Setup
1. Clone the repository:
   ```bash
   git clone [https://github.com/Sagar2inf/brank_chatbot.git](https://github.com/Sagar2inf/brank_chatbot.git)
   cd brank_chatbot

2. Create .env file which should look like this:
    ```
    GROQ_API_KEY=your_key_here
    GEMINI_API_KEY=your_key_here
    ```
3. Run the docker container:
    ```
    docker compose up --build -d
    ```
4. Useful links:
    ```
    Chatbot UI: http://localhost
    Grafana Dashboard: http://localhost:3000 (Login: admin / admin)
    ```
