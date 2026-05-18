from fastapi import APIRouter,UploadFile,File
from langchain_text_splitters import RecursiveCharacterTextSplitter
import pypdf
import io
from app.config import get_settings
from app.vectorstore.chroma import add_documents


router=APIRouter()

splitter=RecursiveCharacterTextSplitter(
    chunk_size=get_settings().chunk_size,
    chunk_overlap=get_settings().chunk_overlap
)

@router.post('/ingest')
async def ingest(file:UploadFile=File(...)):
    text=await extract_text(file)
    chunks=splitter.split_text(text)
    metadatas=[{'source':file.filename,'chunk':i} for i,_ in enumerate(chunks)]
    
    count=add_documents(chunks,metadatas)
    
    return {'filename':file.filename,'chunks_stored':count}

async def extract_text(file:UploadFile):
    content=await file.read()
    
    if file.filename.endswith(".pdf"):
        pdf=pypdf.PdfReader(io.BytesIO(content))
        
        return "\n".join(page.extract_text() for page in pdf.pages)
    return content.decode('utf-8')