from unittest.mock import patch, MagicMock
from app.rag.nodes.hallucination_check import hallucination_check


def test_grounded_answer_unchanged():
    state = {
        "answer": "RAG combines retrieval with generation.",
        "final_context": ["RAG combines retrieval with generation."],
    }
    mock_check = MagicMock()
    mock_check.is_grounded = True

    with patch("app.rag.nodes.hallucination_check.structured_llm") as mock_llm:
        mock_llm.invoke.return_value = mock_check
        result = hallucination_check(state)

    assert result["answer"] == state["answer"]
    assert "Warning" not in result["answer"]


def test_ungrounded_answer_gets_warning():
    state = {
        "answer": "Some hallucinated claim.",
        "final_context": ["Actual context about something else."],
    }
    mock_check = MagicMock()
    mock_check.is_grounded = False

    with patch("app.rag.nodes.hallucination_check.structured_llm") as mock_llm:
        mock_llm.invoke.return_value = mock_check
        result = hallucination_check(state)

    assert "Warning" in result["answer"]


def test_no_context_skips_check():
    state = {"answer": "A direct answer.", "final_context": []}

    with patch("app.rag.nodes.hallucination_check.structured_llm") as mock_llm:
        result = hallucination_check(state)

    # LLM should NOT be called when there's no context to check against
    mock_llm.invoke.assert_not_called()
    assert result["answer"] == "A direct answer."