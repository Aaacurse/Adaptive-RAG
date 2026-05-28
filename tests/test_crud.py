import pytest
import uuid
from app.db import crud


@pytest.mark.asyncio
async def test_create_user(db_session):
    user = await crud.create_user(db_session, "crud@example.com", "pass123")
    assert user.id is not None
    assert user.email == "crud@example.com"
    assert user.hashed_password != "pass123"  # must be hashed


@pytest.mark.asyncio
async def test_get_user_by_email_found(db_session):
    await crud.create_user(db_session, "find@example.com", "pass")
    user = await crud.get_user_by_email(db_session, "find@example.com")
    assert user is not None
    assert user.email == "find@example.com"


@pytest.mark.asyncio
async def test_get_user_by_email_not_found(db_session):
    user = await crud.get_user_by_email(db_session, "ghost@example.com")
    assert user is None


@pytest.mark.asyncio
async def test_create_chat(db_session):
    user = await crud.create_user(db_session, "chat@example.com", "pass")
    chat = await crud.create_chat(db_session, user.id)
    assert chat.id is not None
    assert chat.title == "New Chat"
    assert chat.user_id == user.id


@pytest.mark.asyncio
async def test_get_chats_returns_list(db_session):
    user = await crud.create_user(db_session, "listchats@example.com", "pass")
    await crud.create_chat(db_session, user.id, title="Chat A")
    await crud.create_chat(db_session, user.id, title="Chat B")
    chats = await crud.get_chats(db_session, user.id)
    assert len(chats) == 2


@pytest.mark.asyncio
async def test_get_chat_with_messages(db_session):
    user = await crud.create_user(db_session, "getmsg@example.com", "pass")
    chat = await crud.create_chat(db_session, user.id)
    await crud.add_message(db_session, chat.id, "user", "hello")
    fetched = await crud.get_chat(db_session, chat.id)
    assert fetched is not None
    assert len(fetched.messages) == 1


@pytest.mark.asyncio
async def test_get_chat_nonexistent(db_session):
    result = await crud.get_chat(db_session, uuid.uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_update_chat_title(db_session):
    user = await crud.create_user(db_session, "title@example.com", "pass")
    chat = await crud.create_chat(db_session, user.id)
    updated = await crud.update_chat_title(db_session, chat.id, "New Title")
    assert updated.title == "New Title"


@pytest.mark.asyncio
async def test_delete_chat(db_session):
    user = await crud.create_user(db_session, "del@example.com", "pass")
    chat = await crud.create_chat(db_session, user.id)
    await crud.delete_chat(db_session, chat.id)
    result = await crud.get_chat(db_session, chat.id)
    assert result is None


@pytest.mark.asyncio
async def test_add_message(db_session):
    user = await crud.create_user(db_session, "msg@example.com", "pass")
    chat = await crud.create_chat(db_session, user.id)
    msg = await crud.add_message(
        db_session, chat.id, "assistant", "hello back",
        route_taken="vector", avg_relevance=0.9
    )
    assert msg.id is not None
    assert msg.role == "assistant"
    assert msg.avg_relevance == 0.9