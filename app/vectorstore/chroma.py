import chromadb
import uuid
from app.vectorstore.embeddings import embed_texts,embed_query
from app.config import get_settings
_client=None
_collection=None

def get_collection():
    global _client,_collection
    if _client is None:
        _client=chromadb.PersistentClient(path=get_settings().chroma_persist_path)
        
    if _collection is None:
        _collection=_client.get_or_create_collection(
            name="adaptive_rag_docs",
            metadata={"hnsw:space":"cosine"}
        )
        
    return _collection

def add_documents(chunks:list[str],metadata:list[dict]):
    collection=get_collection()
    
    embedded_chunks=embed_texts(chunks)
    ids=[str(uuid.uuid4()) for chunk in chunks]
    collection.add(ids=ids,embeddings=embedded_chunks,metadatas=metadata,documents=chunks)
    
    return len(chunks)

def similarity_search(query:str,k:int=5):
    collection=get_collection()
    
    embedded_query=embed_query(query)
    
    results=collection.query(query_embeddings=[embedded_query],n_results=k)
    
    return [
        {"text":doc,"metadata":meta} for doc,meta in zip(results["documents"][0],results["metadatas"][0])
    ]
    
    