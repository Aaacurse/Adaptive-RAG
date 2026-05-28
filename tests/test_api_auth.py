def test_register_success(client):
    resp = client.post("/auth/register", json={
        "email": "new@example.com",
        "password": "securepass"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "new@example.com"
    assert "id" in data


def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "pass"}
    client.post("/auth/register", json=payload)
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 400
    assert "already" in resp.json()["detail"].lower()


def test_register_invalid_email(client):
    resp = client.post("/auth/register", json={
        "email": "not-an-email",
        "password": "pass"
    })
    assert resp.status_code == 422  # Pydantic validation


def test_login_success(client):
    client.post("/auth/register", json={"email": "login@example.com", "password": "pass"})
    resp = client.post("/auth/login", data={
        "username": "login@example.com",
        "password": "pass"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post("/auth/register", json={"email": "wp@example.com", "password": "correct"})
    resp = client.post("/auth/login", data={
        "username": "wp@example.com",
        "password": "wrong"
    })
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    resp = client.post("/auth/login", data={
        "username": "ghost@example.com",
        "password": "pass"
    })
    assert resp.status_code == 401