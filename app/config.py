from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    groq_api_key: str
    tavily_api_key: str
    chroma_persist_path: str = "./chroma_db"
    classifier_model: str = "llama-3.1-8b-instant"
    grader_model: str = "llama-3.1-8b-instant"
    generator_model: str = "llama-3.3-70b-versatile"
    top_k: int = 3
    chunk_size: int = 200
    chunk_overlap: int = 50
    high_relevance_threshold: float = 0.7
    low_relevance_threshold: float = 0.15
    max_iterations: int = 2
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    database_url: str
    secret_key: str
    algorithm: str = "HS256"

    model_config = SettingsConfigDict(env_file=".env")

    @classmethod
    def settings_customise_sources(
        cls, settings_cls, init_settings, env_settings, dotenv_settings, **kwargs
    ):
        return init_settings, env_settings, dotenv_settings


CONVERSATIONAL_PHRASES = {
    "thank you",
    "thanks",
    "thanks a lot",
    "thank you so much",
    "ok",
    "okay",
    "okayy",
    "kk",
    "k",
    "got it",
    "understood",
    "i understand",
    "makes sense",
    "great",
    "nice",
    "cool",
    "awesome",
    "perfect",
    "sure",
    "alright",
    "fine",
    "sounds good",
    "bye",
    "goodbye",
    "see you",
    "take care",
    "hello",
    "hi",
    "hey",
    "heyy",
    "yo",
    "good morning",
    "good afternoon",
    "good evening",
    "welcome",
    "no problem",
    "all good",
    "yep",
    "yeah",
    "yup",
    "nah",
    "nope",
    "lol",
    "haha",
    "hehe",
    "hmm",
    "hmmm",
    "uhh",
    "huh",
    "please",
    "sure thing",
    "of course",
    "that's fine",
    "works for me",
    "i see",
    "right",
    "true",
    "exactly",
    "my bad",
    "sorry",
    "no worries",
    "can you help",
    "help me",
    "what do you mean",
    "explain",
    "one more thing",
    "wait",
    "hold on",
}


@lru_cache
def get_settings():
    return Settings()
