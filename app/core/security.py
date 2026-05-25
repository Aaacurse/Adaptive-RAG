from passlib.context import CryptContext
from jose import jwt
from datetime import datetime,timedelta,timezone
from fastapi import HTTPException
from app.config import get_settings
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db


SECRET_KEY=get_settings().secret_key
ALGORITHM=get_settings().algorithm

oauth2_scheme=OAuth2PasswordBearer(tokenUrl='/auth/login')

pwd_context=CryptContext(schemes=['bcrypt'],deprecated='auto')

def hash_password(password:str)->str:
    return pwd_context.hash(password)

def verify_password(plain:str,hashed:str)->bool:
    return pwd_context.verify(plain,hashed)

def create_access_token(data:dict)->str:
    to_encode=data.copy()
    expire=datetime.now(timezone.utc)+timedelta(minutes=1440)
    to_encode['exp']=expire
    return jwt.encode(to_encode,SECRET_KEY,algorithm=ALGORITHM)

def verify_token(token:str)->dict:
    try:
        payload=jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401,detail='Invalid token')
    
async def get_current_user(token:str=Depends(oauth2_scheme),db:AsyncSession=Depends(get_db)):
    payload=verify_token(token)
    email=payload.get("sub")
    if not email:
        raise HTTPException(status_code=401,detail="Invalid Token")
    from app.db.crud import get_user_by_email
    user =await get_user_by_email(db,email)
    if not user:
        raise HTTPException(status_code=401,detail="User not found")
    return user