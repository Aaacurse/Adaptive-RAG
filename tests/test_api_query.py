import uuid
from unittest.mock import MagicMock
from app.api.query import trim_history

def test_trim_history_empty():
    assert trim_history([]) == []


def test_trim_history_under_limit():
    history = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}]
    result = trim_history(history, max_tokens=500)
    assert result == history


def test_trim_history_truncates_oldest():
  
    history = [{"role": "user", "content": "x" * 500}] * 6  
    result = trim_history(history, max_tokens=500)
    assert len(result) < len(history)


def test_trim_history_preserves_order():
    history = [
        {"role": "user", "content": "first"},
        {"role": "assistant", "content": "second"},
        {"role": "user", "content": "third"},
    ]
    result = trim_history(history, max_tokens=500)
    roles = [m["role"] for m in result]
    assert roles == ["user", "assistant", "user"]  # order preserved



def test_query_success(client, auth_headers):
    chat_id = client.post("/chats", headers=auth_headers).json()["id"]

    resp = client.post("/query", headers=auth_headers, json={
        "query": "What is RAG?",
        "chat_id": chat_id,
        "chat_history": []
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert "route_taken" in data
    assert data["answer"] == "mocked_answer"


def test_query_requires_auth(client):
    resp = client.post("/query", json={
        "query": "test",
        "chat_id": str(uuid.uuid4()),
    })
    assert resp.status_code == 401


def test_query_missing_fields(client, auth_headers):
    resp = client.post("/query", headers=auth_headers, json={"query": "test"})
    assert resp.status_code == 422  