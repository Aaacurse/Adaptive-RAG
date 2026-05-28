from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.chats import router as chats_router
from app.api.ingest import router as ingest_router
from app.api.query import router as query_router
from app.config import get_settings
from app.db.database import create_tables
from app.rag.graph import RAGGraph


@asynccontextmanager
async def lifecycle(app: FastAPI):
    await create_tables()
    app.state.rag = RAGGraph()
    yield


app = FastAPI(lifespan=lifecycle)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.get("/health")
def health():
    return {"health": "ok"}


app.include_router(ingest_router)
app.include_router(query_router)
app.include_router(chats_router)
app.include_router(auth_router)
