from pydantic import BaseModel
from fastapi import Request,APIRouter
from app.rag.state import RAGState

router=APIRouter()

class QueryRequest(BaseModel):
    query:str
    
@router.post('/query')
async def query(request:Request,body:QueryRequest):
    rag=request.app.state.rag
    result=rag.graph.invoke({"query":body.query,"iterations":0})
    
    return {
        "answer":result.get('answer'),
        "route_taken":result.get('route_taken'),
        "avg_relevance":result.get('avg_relevance')
    }