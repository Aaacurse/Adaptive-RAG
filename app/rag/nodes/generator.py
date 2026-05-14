from langchain_groq import ChatGroq
from app.config import get_settings
from app.rag.state import RAGState

llm=ChatGroq(
    model=get_settings().generator_model,
    api_key=get_settings().groq_api_key,
    temperature=0.7)

def generator(state:RAGState):
    query=state['query']
    final_context=state['final_context']
    
    context=" ".join(final_context).strip()
    
    prompt=f"""You are a helpful assistant. Answer the question using only the provided context.
    If the context doesn't contain enough information, say so honestly.

    Context:
    {context}

    Question: {query}

    Answer:
    
    """
    
    response=llm.invoke(prompt).content
    
    return {"answer":response}