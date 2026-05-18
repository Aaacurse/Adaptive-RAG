from app.rag.state import RAGState
from app.config import get_settings
from app.vectorstore.chroma import similarity_search

def retriever(state:RAGState):
    query=state['query']
    top_k=get_settings().top_k
    
    results=similarity_search(query,top_k)
    
    return {"documents": results, "route_taken": "vector"}
    