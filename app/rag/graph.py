from langgraph.graph import StateGraph,START,END
from app.rag.state import RAGState
from app.rag.nodes.retriever import retriever
from app.rag.nodes.grader import grader
from app.rag.nodes.generator import generator
from app.rag.nodes.web_search import web_search
from app.rag.nodes.hallucination_check import hallucination_check
from app.config import get_settings


def merge_context(state:RAGState)->dict:
    docs = [d['text'] for d in (state.get('documents') or [])]
    web = [w['text'] for w in (state.get('web_results') or [])]
    return {"final_context": docs + web}


def route_after_grader(state:RAGState)->str:
    avg_relevance=state['avg_relevance']
    
    if avg_relevance>=get_settings().high_relevance_threshold:
        return 'generator'
    else:
        return 'web_search'
    
    
class RAGGraph:
    def __init__(self):
        self.graph=self._build()
        
    def _build(self):
        workflow=StateGraph(RAGState)
        
        #add nodes
        workflow.add_node('retriever',retriever)
        workflow.add_node('grader',grader)
        workflow.add_node('generator',generator)
        workflow.add_node('web_search',web_search)
        workflow.add_node('hallucination_check',hallucination_check)
        workflow.add_node('merge_context',merge_context)
        
        #add edges
        workflow.add_edge(START,'retriever')
        workflow.add_edge('retriever','grader')
        workflow.add_conditional_edges('grader',route_after_grader,{
            'generator':'merge_context',
            'web_search':'web_search'
        })
        workflow.add_edge('web_search','merge_context')
        workflow.add_edge('merge_context','generator')
        workflow.add_edge('generator','hallucination_check')
        workflow.add_edge('hallucination_check',END)
        
        return workflow.compile()