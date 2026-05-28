from app.config import get_settings
from app.rag.state import RAGState
from app.vectorstore.chroma import similarity_search


def retriever(state: RAGState):
    query = state["query"]
    history = state.get("chat_history") or []
    enriched_query = query
    if history:
        last_assistant = next(
            (m["content"] for m in reversed(history) if m["role"] == "assistant"), ""
        )
        enriched_query = f"""{last_assistant[:200]} {query}"""
    else:
        enriched_query
    top_k = get_settings().top_k

    results = similarity_search(enriched_query, top_k)

    return {"documents": results, "route_taken": "vector"}
