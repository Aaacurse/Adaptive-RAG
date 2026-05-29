from typing import cast

from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from app.config import get_settings
from app.rag.state import RAGState

llm = ChatGroq(
    model=get_settings().generator_model,
    api_key=get_settings().groq_api_key,
    temperature=0,
)


class HallucinationCheck(BaseModel):
    is_grounded: bool = Field(
        description="Must be a JSON boolean true or false and not a string"
    )
    reason: str = Field(
        description="Give the reason to support 'why you gave the is_grounded value true or false?'"
    )


structured_llm = llm.with_structured_output(HallucinationCheck)


def hallucination_check(state: RAGState):
    answer = state.get("answer") or ""
    final_context = state.get("final_context") or []
    context = " ".join(final_context).strip()

    if not context:
        return {"answer": answer}

    checker_prompt = f"""You are a fact checker.
    Context:
    {context}

    Generated answer:
    {answer}

    Is this answer fully supported by the context above?
    Return is_grounded as true if yes, false if the answer contains claims not in the context."""

    check = cast(HallucinationCheck, structured_llm.invoke(checker_prompt))

    if check.is_grounded:
        return {"answer": answer}

    return {
        "answer": answer + "\n\nWarning: this answer may contain unverified claims."
    }
