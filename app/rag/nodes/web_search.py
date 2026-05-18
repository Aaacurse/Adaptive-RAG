from tavily import TavilyClient
from app.rag.state import RAGState
from app.config import get_settings

client=TavilyClient(api_key=get_settings().tavily_api_key)


def web_search(state:RAGState):
    query=state['query']
    
    results=client.search(query,max_results=5)
    
    formatted_results=[
        {"text":r['content'],"metadata":{"source":r["url"]}} for r in results["results"]
    ]
    
    return {"web_results": formatted_results, "route_taken": "web"}