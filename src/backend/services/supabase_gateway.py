from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx

from backend.config import get_settings


@dataclass(slots=True)
class SupabaseUser:
    id: str
    email: str | None
    user_metadata: dict[str, Any]


class SupabaseGateway:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.supabase_url.rstrip("/")
        self.anon_key = settings.supabase_anon_key
        self.service_role_key = settings.supabase_service_role_key
        self._client: httpx.AsyncClient | None = None

    def is_configured(self) -> bool:
        return bool(self.base_url and self.anon_key and self.service_role_key)

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=20)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
        self._client = None

    def _rest_url(self, table: str, query: Mapping[str, str] | None = None) -> str:
        base = f"{self.base_url}/rest/v1/{table}"
        if not query:
            return base
        return f"{base}?{urlencode(query)}"

    def _headers(self, *, service_role: bool = False, auth_token: str | None = None) -> dict[str, str]:
        key = self.service_role_key if service_role else self.anon_key
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {auth_token or key}",
            "Content-Type": "application/json",
        }
        return headers

    async def auth_user(self, access_token: str) -> SupabaseUser | None:
        client = self._get_client()
        response = await client.get(
            f"{self.base_url}/auth/v1/user",
            headers=self._headers(auth_token=access_token),
        )
        if response.status_code >= 400:
            return None
        payload = response.json()
        return SupabaseUser(
            id=payload["id"],
            email=payload.get("email"),
            user_metadata=payload.get("user_metadata") or {},
        )

    async def admin_get_user(self, user_id: str) -> dict[str, Any] | None:
        client = self._get_client()
        response = await client.get(
            f"{self.base_url}/auth/v1/admin/users/{user_id}",
            headers=self._headers(service_role=True),
        )
        if response.status_code >= 400:
            return None
        payload = response.json()
        return payload.get("user")

    async def select(
        self,
        table: str,
        *,
        query: Mapping[str, str],
        service_role: bool = True,
        auth_token: str | None = None,
    ) -> list[dict[str, Any]]:
        client = self._get_client()
        response = await client.get(
            self._rest_url(table, query),
            headers=self._headers(service_role=service_role, auth_token=auth_token),
        )
        response.raise_for_status()
        return response.json()

    async def insert(
        self,
        table: str,
        payload: dict[str, Any] | list[dict[str, Any]],
        *,
        prefer: str | None = None,
    ) -> list[dict[str, Any]]:
        headers = self._headers(service_role=True)
        if prefer:
            headers["Prefer"] = prefer
        client = self._get_client()
        response = await client.post(
            self._rest_url(table),
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        if not response.content:
            return []
        return response.json()

    async def upsert(
        self,
        table: str,
        payload: dict[str, Any] | list[dict[str, Any]],
        *,
        on_conflict: str,
    ) -> list[dict[str, Any]]:
        headers = self._headers(service_role=True)
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        client = self._get_client()
        response = await client.post(
            self._rest_url(table, {"on_conflict": on_conflict}),
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        if not response.content:
            return []
        return response.json()

    async def update(
        self,
        table: str,
        *,
        query: Mapping[str, str],
        payload: dict[str, Any],
    ) -> list[dict[str, Any]]:
        headers = self._headers(service_role=True)
        headers["Prefer"] = "return=representation"
        client = self._get_client()
        response = await client.patch(
            self._rest_url(table, query),
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        if not response.content:
            return []
        return response.json()

    async def delete(
        self,
        table: str,
        *,
        query: Mapping[str, str],
    ) -> list[dict[str, Any]]:
        headers = self._headers(service_role=True)
        headers["Prefer"] = "return=representation"
        client = self._get_client()
        response = await client.delete(
            self._rest_url(table, query),
            headers=headers,
        )
        response.raise_for_status()
        if not response.content:
            return []
        return response.json()

    async def upload_storage_object(
        self,
        bucket: str,
        path: str,
        content: bytes,
        *,
        content_type: str = "application/octet-stream",
    ) -> None:
        headers = self._headers(service_role=True)
        headers["Content-Type"] = content_type
        headers["x-upsert"] = "true"
        client = self._get_client()
        response = await client.post(
            f"{self.base_url}/storage/v1/object/{bucket}/{path}",
            headers=headers,
            content=content,
            timeout=60,
        )
        response.raise_for_status()

    async def create_signed_storage_urls(
        self,
        bucket: str,
        paths: list[str],
        *,
        expires_in: int = 3600,
    ) -> list[str]:
        if not paths:
            return []
        headers = self._headers(service_role=True)
        client = self._get_client()
        response = await client.post(
            f"{self.base_url}/storage/v1/object/sign/{bucket}",
            headers=headers,
            json={"paths": paths, "expiresIn": expires_in},
        )
        if response.status_code >= 400:
            return []
        payload = response.json()
        signed = payload if isinstance(payload, list) else payload.get("signedUrls") or []
        urls: list[str] = []
        for item in signed:
            if isinstance(item, dict) and item.get("signedURL"):
                urls.append(f"{self.base_url}/storage/v1{item['signedURL']}")
            elif isinstance(item, str):
                urls.append(item)
        return urls


_gateway: SupabaseGateway | None = None


def get_supabase_gateway() -> SupabaseGateway:
    global _gateway
    if _gateway is None:
        _gateway = SupabaseGateway()
    return _gateway


async def close_supabase_gateway() -> None:
    global _gateway
    if _gateway is not None:
        await _gateway.aclose()
        _gateway = None
