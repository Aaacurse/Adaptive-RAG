from fastapi import APIRouter,Depends,HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.db.database import get_db
from app.db import crud
import uuid
from app.db.models import User
from app.core.security import get_current_user

router=APIRouter()

class  UpdateTitleRequest(BaseModel):
    title:str

@router.post('/chats')
async def create_chat(db:AsyncSession=Depends(get_db),current_user:User=Depends(get_current_user)):
    chat=await crud.create_chat(db,current_user.id)
    return chat

@router.get('/chats')
async def list_all_chats(db:AsyncSession=Depends(get_db),current_user:User=Depends(get_current_user)):
    chats=await crud.get_chats(db,current_user.id)
    return chats

@router.get('/chats/{chat_id}')
async def get_chat_by_id(chat_id:uuid.UUID,db:AsyncSession=Depends(get_db),current_user:User=Depends(get_current_user)):
    chat=await crud.get_chat(db,chat_id)
    if not chat:
        raise HTTPException(status_code=404,detail='Chat not found')
    return chat

@router.delete('/chats/{chat_id}')
async def delete_chat(chat_id:uuid.UUID,db:AsyncSession=Depends(get_db),current_user:User=Depends(get_current_user)):
    chat=await crud.get_chat(db,chat_id)
    if not chat:
        raise HTTPException(status_code=404,detail='Chat not found')
    await crud.delete_chat(db,chat_id)
    return JSONResponse(content={"message": "Chat Deleted"},status_code=200)

@router.patch('/chats/{chat_id}/title')
async def update_chat_title(chat_id:uuid.UUID,body:UpdateTitleRequest,db:AsyncSession=Depends(get_db),current_user:User=Depends(get_current_user)):
    chat=await crud.get_chat(db,chat_id)
    if not chat:
        raise HTTPException(status_code=404,detail="Chat not found")
    updated=await crud.update_chat_title(db,chat_id,body.title)
    return updated
    