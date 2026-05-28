from unittest.mock import patch, MagicMock
from app.rag.nodes.grader import grader


def test_grader_returns_avg_relevance_and_filters():
    docs = [
        {"text": "very relevant doc", "metadata": {}},
        {"text": "irrelevant doc", "metadata": {}},
    ]
    state = {"query": "test", "documents": docs}

    # Mock structured_llm to return high score for first doc, low for second
    mock_score_high = MagicMock()
    mock_score_high.score = 0.9
    mock_score_low = MagicMock()
    mock_score_low.score = 0.1

    with patch("app.rag.nodes.grader.structured_llm") as mock_llm:
        mock_llm.invoke.side_effect = [mock_score_high, mock_score_low]
        result = grader(state)

    assert "avg_relevance" in result
    # Only the high-scoring doc (0.9 > threshold 0.15) passes through
    assert len(result["documents"]) == 1
    assert result["documents"][0]["text"] == "very relevant doc"


def test_grader_empty_documents():
    state = {"query": "test", "documents": []}
    with patch("app.rag.nodes.grader.structured_llm"):
        result = grader(state)
    assert result["avg_relevance"] == 0.0
    assert result["documents"] == []