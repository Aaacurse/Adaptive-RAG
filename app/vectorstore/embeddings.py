from sentence_transformers import SentenceTransformer

_model=None

def embed_texts(texts:list[str])->list[list[float]]:
    global _model
    if _model is None:
        _model=SentenceTransformer("all-MiniLM-L6-v2")
    
    return _model.encode(texts).tolist()

        
def embed_query(query:str)->list[float]:
    return embed_texts([query])[0]