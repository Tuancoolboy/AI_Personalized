import pytest

from backend.tests.test_api.helpers import assert_api_error, patch_service


@pytest.mark.asyncio
async def test_post_lead_rejects_malformed_email(client):
    response = await client.post("/api/leads", json={"email": "not-an-email"})
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_post_lead_rejects_invalid_json(client):
    response = await client.post(
        "/api/leads",
        content=b"not-json",
        headers={"Content-Type": "application/json"},
    )
    assert_api_error(response, 400, "VALIDATION_ERROR")
