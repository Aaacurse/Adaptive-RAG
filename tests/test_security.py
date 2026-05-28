import pytest
import time
from unittest.mock import patch,MagicMock
from jose import jwt
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    verify_token
)

def test_hash_password_returns_string():
    hashed=hash_password("mysecret")
    assert isinstance(hashed,str)
    assert hashed!="mysecret"
    
def test_hashed_password_is_not_deterministic():
    h1=hash_password('mysecret')
    h2=hash_password('mysecret')
    assert h1!=h2
    
def test_verify_password_correct():
    hashed = hash_password("correct")
    assert verify_password("correct", hashed) is True
    
def test_verify_password_wrong():
    hashed = hash_password("correct")
    assert verify_password("wrong", hashed) is False
    
def test_create_access_token_is_jwt():
    token=create_access_token({'sub':'user@example.com'})
    assert isinstance(token,str)
    assert len(token.split('.'))==3
    
def test_create_access_token_contains_sub():
    token=create_access_token({'sub':"user@example.com"})
    from app.config import get_settings
    s=get_settings()
    payload=jwt.decode(token,s.secret_key,algorithms=[s.algorithm])
    assert payload['sub']=='user@example.com'
    
def test_verify_token_valid():
    token=create_access_token({'sub':'user@example.com'})
    payload=verify_token(token)
    assert payload['sub']=='user@example.com'
    
def test_verify_token_invalid_raises():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        verify_token("not.a.real.token")
    assert exc_info.value.status_code == 401

def test_verify_token_expired_raises():
    from fastapi import HTTPException
    from app.config import get_settings
    import datetime
    s = get_settings()
    payload = {
        "sub": "user@example.com",
        "exp": datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=1)
    }
    expired_token = jwt.encode(payload, s.secret_key, algorithm=s.algorithm)
    with pytest.raises(HTTPException) as exc_info:
        verify_token(expired_token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()