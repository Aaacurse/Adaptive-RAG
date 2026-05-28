from unittest.mock import patch
from app.rag.nodes.retriever import retriever


def base_state(query="test query", history=None):
    return {"query": query, "chat_history": history or [], "iterations": 0}


def test_retriever_calls_similarity_search():
    mock_results = [{"text": "doc1", "metadata": {}}]
    with patch("app.rag.nodes.retriever.similarity_search", return_value=mock_results) as mock_search:
        result = retriever(base_state())
    mock_search.assert_called_once()
    assert result["documents"] == mock_results
    assert result["route_taken"] == "vector"


def test_retriever_enriches_query_with_history():
    history = [
        {"role": "user", "content": "Previous question"},
        {"role": "assistant", "content": "Previous answer from assistant"},
    ]
    with patch("app.rag.nodes.retriever.similarity_search", return_value=[]) as mock_search:
        retriever(base_state(query="follow-up question", history=history))
    called_query = mock_search.call_args[0][0]
    # Enriched query should include part of the last assistant message
    assert "Previous answer" in called_query


def test_retriever_no_history_uses_plain_query():
    with patch("app.rag.nodes.retriever.similarity_search", return_value=[]) as mock_search:
        retriever(base_state(query="plain query"))
    called_query = mock_search.call_args[0][0]
    assert "plain query" in called_query