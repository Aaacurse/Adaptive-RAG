from sqlalchemy import String,Float,DateTime,ForeignKey,Text
from sqlalchemy.orm import Mapped,mapped_column,relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime,timezone,UTC
import uuid
from app.db.database import Base
from typing import Optional

class Chat(Base):
    __tablename__="chats"
    
    user_id:Mapped[uuid.UUID]=mapped_column(ForeignKey('users.id'))
    user:Mapped["User"]=relationship(back_populates='chats')
    id:Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    title:Mapped[str]=mapped_column(String(100),default="New Chat")
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))
    messages:Mapped[list['Message']]=relationship(back_populates='chat',cascade='all,delete-orphan')
    
class Message(Base):
    __tablename__='messages'
    id:Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    chat_id:Mapped[uuid.UUID]=mapped_column(ForeignKey('chats.id'))
    role:Mapped[str]=mapped_column(String(10))
    content:Mapped[str]=mapped_column(Text)
    route_taken:Mapped[Optional[str]]=mapped_column(String(10),nullable=True)
    avg_relevance:Mapped[Optional[float]]=mapped_column(Float,nullable=True)
    chat:Mapped["Chat"]=relationship(back_populates='messages')
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))
    
class User(Base):
    __tablename__='users'
    
    id:Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    email:Mapped[str]=mapped_column(String(255),unique=True,index=True)
    hashed_password:Mapped[str]=mapped_column(String(255))
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda: datetime.now(timezone.utc))
    chats:Mapped[list['Chat']]=relationship(back_populates='user',cascade='all, delete-orphan')