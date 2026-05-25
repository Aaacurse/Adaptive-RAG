from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache

class Settings(BaseSettings):
    groq_api_key:str
    tavily_api_key:str
    chroma_persist_path:str="./chroma_db"
    classifier_model: str = "llama-3.1-8b-instant"
    grader_model: str = "llama-3.1-8b-instant"
    generator_model: str = "llama-3.3-70b-versatile"
    top_k:int=5
    chunk_size:int=300
    chunk_overlap:int=50
    high_relevance_threshold:float=0.7
    low_relevance_threshold:float=0.15
    max_iterations:int=2
    cors_origins:list[str]=["http://localhost:3000","http://localhost:5173"]
    database_url:str=Field(...,env='DATABASE_URL')
    secret_key:str=Field(...,env='SECRET_KEY')
    algorithm:str="HS256"
    
    
    class Config:
        env_file=".env"
        
@lru_cache()
def get_settings():
    return Settings()