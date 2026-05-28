import pytest
from unittest.mock import patch, MagicMock
from app.rag.graph import is_conversational, merge_context, route_after_grader
from app.rag.state import RAGState


def make_state(query, **kwargs) -> RAGState:
    defaults = dict(
        query=query,
        documents=None,
        avg_relevance=None,
        web_results=None,
        final_context=None,
        answer=None,
        route_taken=None,
        iterations=0,
        chat_history=None,
    )
    defaults.update(kwargs)  # kwargs override defaults, no duplicates
    return RAGState(**defaults)

def test_is_conversational_with_greeting():
    assert is_conversational(make_state("hello")) == "direct"

def test_is_conversational_with_thanks():
    assert is_conversational(make_state("thank you")) == "direct"

def test_is_conversational_with_real_question():
    assert is_conversational(make_state("What is retrieval augmented generation?")) == "retriever"

def test_is_conversational_case_insensitive():
    assert is_conversational(make_state("Hello")) == "direct"
    assert is_conversational(make_state("THANKS")) == "direct"

def test_merge_context_combines_docs_and_web():
    state = make_state("q",
        documents=[{"text": "doc1"}, {"text": "doc2"}],
        web_results=[{"text": "web1"}]
    )
    result = merge_context(state)
    assert result["final_context"] == ["doc1", "doc2", "web1"]

def test_merge_context_handles_none():
    state = make_state("q", documents=None, web_results=None)
    result = merge_context(state)
    assert result["final_context"] == []

def test_route_after_grader_high_relevance():
    state = make_state("q", avg_relevance=0.8)
    assert route_after_grader(state) == "generator"

def test_route_after_grader_low_relevance():
    state = make_state("q", avg_relevance=0.3)
    assert route_after_grader(state) == "web_search"

def test_route_after_grader_at_threshold():
    from app.config import get_settings
    threshold = get_settings().high_relevance_threshold
    state = make_state("q", avg_relevance=threshold)
    assert route_after_grader(state) == "generator"