from unittest.mock import patch, MagicMock
from app.rag.nodes.generator import generator


def test_generator_with_context():
    state = {
        "query": "What is RAG?",
        "final_context": ["RAG stands for Retrieval Augmented Generation."],
        "chat_history": [],
    }
    mock_response = MagicMock()
    mock_response.content = "RAG is a technique..."

    with patch("app.rag.nodes.generator.llm") as mock_llm:
        mock_llm.invoke.return_value = mock_response
        result = generator(state)

    assert result["answer"] == "RAG is a technique..."
    # Verify llm was called with messages that include context
    call_args = mock_llm.invoke.call_args[0][0]
    system_msg = call_args[0].content
    assert "RAG stands for Retrieval" in system_msg


def test_generator_without_context():
    state = {
        "query": "hi",
        "final_context": [],
        "chat_history": [],
    }
    mock_response = MagicMock()
    mock_response.content = "Hello!"

    with patch("app.rag.nodes.generator.llm") as mock_llm:
        mock_llm.invoke.return_value = mock_response
        result = generator(state)

    assert result["answer"] == "Hello!"
    # Without context, system prompt should NOT mention context
    call_args = mock_llm.invoke.call_args[0][0]
    system_msg = call_args[0].content
    assert "Context:" not in system_msg


def test_generator_includes_chat_history():
    state = {
        "query": "follow-up?",
        "final_context": [],
        "chat_history": [
            {"role": "user", "content": "First question"},
            {"role": "assistant", "content": "First answer"},
        ],
    }
    mock_response = MagicMock()
    mock_response.content = "follow-up answer"

    with patch("app.rag.nodes.generator.llm") as mock_llm:
        mock_llm.invoke.return_value = mock_response
        generator(state)

    messages = mock_llm.invoke.call_args[0][0]
    # system + 2 history msgs + 1 current query = 4 total
    assert len(messages) == 4