import uuid


def test_create_chat(client, auth_headers):
    resp = client.post("/chats", headers=auth_headers)
    assert resp.status_code == 200
    assert "id" in resp.json()


def test_list_chats(client, auth_headers):
    client.post("/chats", headers=auth_headers)
    client.post("/chats", headers=auth_headers)
    resp = client.get("/chats", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 2


def test_get_chat_by_id(client, auth_headers):
    create_resp = client.post("/chats", headers=auth_headers)
    chat_id = create_resp.json()["id"]
    resp = client.get(f"/chats/{chat_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == chat_id


def test_get_chat_not_found(client, auth_headers):
    resp = client.get(f"/chats/{uuid.uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_chat(client, auth_headers):
    create_resp = client.post("/chats", headers=auth_headers)
    chat_id = create_resp.json()["id"]
    del_resp = client.delete(f"/chats/{chat_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    get_resp = client.get(f"/chats/{chat_id}", headers=auth_headers)
    assert get_resp.status_code == 404


def test_update_chat_title(client, auth_headers):
    create_resp = client.post("/chats", headers=auth_headers)
    chat_id = create_resp.json()["id"]
    resp = client.patch(f"/chats/{chat_id}/title", headers=auth_headers,
                        json={"title": "My New Title"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "My New Title"


def test_chat_access_denied_for_other_user(client):

    client.post("/auth/register", json={"email": "userA@example.com", "password": "pass"})
    resp_a = client.post("/auth/login", data={"username": "userA@example.com", "password": "pass"})
    headers_a = {"Authorization": f"Bearer {resp_a.json()['access_token']}"}


    client.post("/auth/register", json={"email": "userB@example.com", "password": "pass"})
    resp_b = client.post("/auth/login", data={"username": "userB@example.com", "password": "pass"})
    headers_b = {"Authorization": f"Bearer {resp_b.json()['access_token']}"}

    chat_id = client.post("/chats", headers=headers_a).json()["id"]

    resp = client.get(f"/chats/{chat_id}", headers=headers_b)
    assert resp.status_code == 403


def test_requires_auth(client):
    resp = client.get("/chats")
    assert resp.status_code == 401