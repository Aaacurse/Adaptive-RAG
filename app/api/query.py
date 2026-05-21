from pydantic import BaseModel
from fastapi import Request,APIRouter
from app.rag.state import RAGState

router=APIRouter()

class QueryRequest(BaseModel):
    query:str
    chat_history:list[dict]=[]
    
@router.post('/query')
async def query(request:Request,body:QueryRequest):
    rag=request.app.state.rag
    result=rag.graph.invoke({"query":body.query,"iterations":0,'chat_history':trim_history(body.chat_history)})
    
    return {
        "answer":result.get('answer'),
        "route_taken":result.get('route_taken'),
        "avg_relevance":result.get('avg_relevance')
    }
    
def trim_history(history:list[dict],max_tokens:int=500)->list[dict]:
    total=0
    trimmed=[]
    for msg in reversed(history):
        estimated_tokens=len(msg['content'])//4
        if total+estimated_tokens>max_tokens:
            break
        
        trimmed.insert(0,msg)
        total+=estimated_tokens
    return trimmed
        