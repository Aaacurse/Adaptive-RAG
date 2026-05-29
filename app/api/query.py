import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db import crud
from app.db.database import get_db
from app.db.models import User

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    chat_id: uuid.UUID
    chat_history: list[dict] = []


@router.post("/query")
async def query(
    request: Request,
    body: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rag = request.app.state.rag
    result = rag.graph.invoke(
        {
            "query": body.query,
            "iterations": 0,
            "chat_history": trim_history(body.chat_history),
        }
    )

    await crud.add_message(db, body.chat_id, "user", body.query)
    await crud.add_message(
        db,
        body.chat_id,
        "assistant",
        result.get("answer"),
        result.get("route_taken"),
        result.get("avg_relevance"),
    )

    return {
        "answer": result.get("answer"),
        "route_taken": result.get("route_taken"),
        "avg_relevance": result.get("avg_relevance"),
    }


def trim_history(history: list[dict], max_tokens: int = 500) -> list[dict]:
    total = 0
    trimmed: list[dict] = []
    for msg in reversed(history):
        estimated_tokens = len(msg["content"]) // 4
        if total + estimated_tokens > max_tokens:
            break

        trimmed.insert(0, msg)
        total += estimated_tokens
    return trimmed
