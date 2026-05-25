from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,desc,update
from sqlalchemy.orm import selectinload
from app.db.models import Chat,Message,User
from app.core.security import hash_password
from datetime import datetime,timezone
import uuid
from pydantic import EmailStr

async def create_chat(db:AsyncSession,user_id:uuid.UUID,title:str="New Chat")->Chat:
    chat=Chat(title=title,user_id=user_id)
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat

async def get_chats(db:AsyncSession,user_id:uuid.UUID)->list[Chat]:
    result=await db.execute(
        select(Chat).where(Chat.user_id==user_id).order_by(desc(Chat.created_at))
    )
    return result.scalars().all()

async def get_chat(db:AsyncSession,chat_id:uuid.UUID)->Chat:
    result=await db.execute(
        select(Chat).options(selectinload(Chat.messages)).where(Chat.id==chat_id)
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

async def create_user(db:AsyncSession,email:EmailStr,password:str):
    hashed_pass=hash_password(password)
    user=User(
        email=email,
        hashed_password=hashed_pass
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user

async def get_user_by_email(db:AsyncSession,email:EmailStr):
    result=await db.execute(select(User).where(User.email==email))
    return result.scalar_one_or_none()