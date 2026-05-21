from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage,SystemMessage,AIMessage
from app.config import get_settings
from app.rag.state import RAGState

llm=ChatGroq(
    model=get_settings().generator_model,
    api_key=get_settings().groq_api_key,
    temperature=0.7)

def generator(state:RAGState):
    query=state['query']
    final_context=state['final_context']
    history=state.get('chat_history') or []
        
    context=" ".join(final_context).strip()
    
    messages=[
        SystemMessage(content=f"""You are a helpful assistant. Answer the question using only the provided context.
    If the context doesn't contain enough information, say so honestly.
    
    Context:
    {context}""")    
    ]
    for m in history:
        if m['role']=='user':
            messages.append(HumanMessage(content=m['content']))
        else:
            messages.append(AIMessage(content=m['content']))
    messages.append(HumanMessage(content=query))
    response=llm.invoke(messages).content
    
    return {"answer":response}