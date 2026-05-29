from typing import cast

from langchain_groq import ChatGroq
from pydantic import BaseModel

from app.config import get_settings
from app.rag.state import RAGState


class RelevanceScore(BaseModel):
    score: float


llm = ChatGroq(
    model=get_settings().grader_model,
    api_key=get_settings().groq_api_key,
    temperature=0,
)

structured_llm = llm.with_structured_output(RelevanceScore)


def grader(state: RAGState):
    query = state["query"]
    documents = state.get("documents") or []
    result_scores: list[RelevanceScore] = [
        cast(
            RelevanceScore,
            structured_llm.invoke(f"""
    You are a relevance grader.
    Given this question: {query}
    And this document chunk: {doc["text"]}
    Score how relevant this document is for answering the question.
    0.0 = completely irrelevant
    0.5 = partially relevant
    1.0 = directly answers the question
    Be strict. Only give high scores if the document clearly helps answer the question.
    """),
        )
        for doc in documents
    ]

    scores = [r.score for r in result_scores]
    avg_relevance = sum(sorted(scores, reverse=True)[:2]) / 2 if scores else 0.0

    threshold = get_settings().low_relevance_threshold

    filtered_docs = [
        doc for doc, score in zip(documents or [], scores) if score > threshold
    ]

    return {"documents": filtered_docs, "avg_relevance": avg_relevance}
