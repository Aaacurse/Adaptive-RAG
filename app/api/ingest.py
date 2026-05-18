from fastapi import APIRouter,UploadFile,File
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import get_settings
from app.vectorstore.chroma import add_documents


router=APIRouter()

splitter=RecursiveCharacterTextSplitter(
    chunk_size=get_settings().chunk_size,
    chunk_overlap=get_settings().chunk_overlap
)

@router.post('/ingest')
async def ingest(file:UploadFile=File(...)):
    content=await file.read()
    text=content.decode('utf-8')
    chunks=splitter.split_text(text)
    metadatas=[{'source':file.filename,'chunk':i} for i,_ in enumerate(chunks)]
    
    count=add_documents(chunks,metadatas)
    
    return {'filename':file.filename,'chunks_stored':count}
