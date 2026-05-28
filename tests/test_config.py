from app.config import get_settings, CONVERSATIONAL_PHRASES


def test_settings_loads():
    s = get_settings()
    assert s.groq_api_key == "test-groq-key"
    assert s.tavily_api_key == "test-tavily-key"
    assert s.algorithm == "HS256"


def test_default_thresholds():
    s = get_settings()
    assert 0 < s.low_relevance_threshold < s.high_relevance_threshold < 1.0


def test_conversational_phrases_is_set():
    assert isinstance(CONVERSATIONAL_PHRASES, set)
    assert "hello" in CONVERSATIONAL_PHRASES
    assert "thank you" in CONVERSATIONAL_PHRASES
    assert "bye" in CONVERSATIONAL_PHRASES


def test_conversational_phrases_are_lowercase():
    for phrase in CONVERSATIONAL_PHRASES:
        assert phrase == phrase.lower(), f"Phrase not lowercase: {phrase!r}"