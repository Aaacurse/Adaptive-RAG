from unittest.mock import patch, MagicMock
from app.rag.nodes.web_search import web_search


def test_web_search_formats_results():
    state = {"query": "What is LangGraph?"}

    mock_results = {
        "results": [
            {"content": "LangGraph is a library.", "url": "https://example.com/1"},
            {"content": "Used for building agents.", "url": "https://example.com/2"},
        ]
    }

    with patch("app.rag.nodes.web_search.client") as mock_client:
        mock_client.search.return_value = mock_results
        result = web_search(state)

    assert result["route_taken"] == "web"
    assert len(result["web_results"]) == 2
    assert result["web_results"][0]["text"] == "LangGraph is a library."
    assert result["web_results"][0]["metadata"]["source"] == "https://example.com/1"


def test_web_search_calls_with_query():
    state = {"query": "specific question"}

    with patch("app.rag.nodes.web_search.client") as mock_client:
        mock_client.search.return_value = {"results": []}
        web_search(state)

    mock_client.search.assert_called_once_with("specific question", max_results=5)