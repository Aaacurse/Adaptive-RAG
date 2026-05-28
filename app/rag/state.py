from typing import Literal, TypedDict


class RAGState(TypedDict):
    query: str
    documents: list[dict] | None
    avg_relevance: float | None
    web_results: list[dict] | None
    final_context: list[str] | None
    answer: str | None
    route_taken: Literal["direct", "vector", "web"] | None
    iterations: int
    chat_history: list[dict] | None
