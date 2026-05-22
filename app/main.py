from contextlib import asynccontextmanager
from app.rag.graph import RAGGraph
from fastapi import FastAPI
from app.config import get_settings
from fastapi.middleware.cors import CORSMiddleware


from app.api.ingest import router as ingest_router
from app.api.query import router as query_router

from app.db.database import create_tables

@asynccontextmanager
async def lifecycle(app:FastAPI):
    await create_tables()
    app.state.rag=RAGGraph()
    yield
    
app=FastAPI(lifespan=lifecycle)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["*"],
    allow_headers=["*"]
    )

@app.get('/health')
def health():
    return {"health":"ok"}

app.include_router(ingest_router)
app.include_router(query_router)