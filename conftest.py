import os
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("TAVILY_API_KEY", "test-tavily-key")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")

import pytest
from unittest.mock import MagicMock, patch

# --- Patch all LLMs BEFORE any app module is imported ---
mock_grader_llm = MagicMock()
mock_grader_llm.invoke.return_value = MagicMock(score=0.9)

mock_generator_llm = MagicMock()
mock_generator_llm.invoke.return_value = MagicMock(content="mocked answer")

mock_hallucination_llm = MagicMock()
mock_hallucination_llm.invoke.return_value = MagicMock(is_grounded=True, reason="ok")

mock_tavily = MagicMock()
mock_tavily.search.return_value = {"results": []}

mock_chroma_client = MagicMock()
mock_collection = MagicMock()
mock_collection.query.return_value = {"documents": [[]], "metadatas": [[]]}
mock_chroma_client.get_or_create_collection.return_value = mock_collection

mock_embedder = MagicMock()
mock_embedder.encode.return_value = [[0.1, 0.2, 0.3]]

with patch("langchain_groq.ChatGroq", return_value=MagicMock()), \
     patch("tavily.TavilyClient", return_value=mock_tavily), \
     patch("chromadb.PersistentClient", return_value=mock_chroma_client), \
     patch("sentence_transformers.SentenceTransformer", return_value=mock_embedder):
    from app.db.database import Base, get_db
    from app.db import models  # noqa
    from app.main import app

# Now patch the already-created module-level LLM instances
import app.rag.nodes.grader as grader_mod
import app.rag.nodes.generator as generator_mod
import app.rag.nodes.hallucination_check as hallucination_mod

grader_mod.structured_llm = mock_grader_llm
generator_mod.llm = mock_generator_llm
hallucination_mod.structured_llm = mock_hallucination_llm

# --- DB setup ---
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
import pytest_asyncio


@pytest.fixture(scope="session")
def engine():
    return create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


@pytest_asyncio.fixture(scope="session")
async def create_db(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session(engine, create_db):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
def client(db_session):

    async def override_get_db():
        yield db_session

    mock_graph = MagicMock()

    mock_graph.invoke.return_value = {
        "answer": "mocked_answer",
        "route_taken": "vector",
        "avg_relevance": 0.85
    }

    mock_rag = MagicMock()
    mock_rag.graph = mock_graph

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:

        # set AFTER startup finishes
        app.state.rag = mock_rag

        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "password123"
    })
    resp = client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "password123"
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}