import io
from unittest.mock import patch


def test_ingest_txt_file(client, auth_headers):
    with patch("app.api.ingest.add_documents", return_value=3):
        content = b"This is a test document with some content."
        resp = client.post(
            "/ingest",
            headers=auth_headers,
            files={"file": ("test.txt", io.BytesIO(content), "text/plain")},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["filename"] == "test.txt"
    assert data["chunks_stored"] == 3


def test_ingest_pdf_file(client, auth_headers):
    # We mock pypdf so we don't need a real PDF
    with patch("app.api.ingest.pypdf.PdfReader") as mock_pdf, \
         patch("app.api.ingest.add_documents", return_value=2):
        mock_page = type("Page", (), {"extract_text": lambda self: "page text"})()
        mock_pdf.return_value.pages = [mock_page]

        fake_pdf = b"%PDF-1.4 fake content"
        resp = client.post(
            "/ingest",
            headers=auth_headers,
            files={"file": ("doc.pdf", io.BytesIO(fake_pdf), "application/pdf")},
        )
    assert resp.status_code == 200
    assert resp.json()["chunks_stored"] == 2


def test_ingest_requires_auth(client):
    content = b"some text"
    resp = client.post(
        "/ingest",
        files={"file": ("test.txt", io.BytesIO(content), "text/plain")},
    )
    assert resp.status_code == 401