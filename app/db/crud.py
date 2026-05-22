from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,desc,update
from app.db.models import Chat,Message
from datetime import datetime,timezone
import uuid

async def create_chat(db:AsyncSession,title:str="New Chat")->Chat:
    chat=Chat(title=title)
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat

async def get_chats(db:AsyncSession)->list[Chat]:
    result=await db.execute(
        select(Chat).order_by(desc(Chat.created_at))
    )
    return result.scalars().all()

async def get_chat(db:AsyncSession,chat_id:uuid.UUID)->Chat:
    result=await db.execute(
        select(Chat).where(Chat.id==chat_id)
    )
    return result.scalar_one_or_none()

async def update_chat_title(db:AsyncSession,chat_id:uuid.UUID,title:str)->Chat:
    chat=await get_chat(db,chat_id)
    chat.title=title
    chat.updated_at=datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(chat)
    return chat

async def delete_chat(db:AsyncSession,chat_id:uuid.UUID)->Chat:
    chat=await get_chat(db,chat_id)
    await db.delete(chat)
    await db.commit()
    
async def add_message(db:AsyncSession,chat_id:uuid.UUID,role:str,content:str,route_taken:str=None,avg_relevance:float=None)->Message:
    message=Message(
        chat_id=chat_id,
        role=role,
        content=content,
        route_taken=route_taken,
        avg_relevance=avg_relevance
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message