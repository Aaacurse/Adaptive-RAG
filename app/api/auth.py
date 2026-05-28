from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_password
from app.db.crud import create_user, get_user_by_email
from app.db.database import get_db


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


router = APIRouter()


@router.post("/auth/register")
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, email=body.email)
    if existing:
        raise HTTPException(status_code=400, detail="User already Exist")
    user = await create_user(db, body.email, body.password)

    return {"id": str(user.id), "email": user.email, "created_at": user.created_at}


@router.post("/auth/login")
async def login(
    form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    user = await get_user_by_email(db, form.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.email})

    return {"access_token": token, "token_type": "bearer"}
