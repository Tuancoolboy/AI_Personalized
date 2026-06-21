import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["env"] == "test"


@pytest.mark.asyncio
async def test_backend_status(client):
    response = await client.get("/api/v1/status")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["env"] == "test"
