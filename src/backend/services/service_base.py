from __future__ import annotations

from backend.services.supabase_gateway import SupabaseGateway


class ServiceBase:
    def __init__(self, gateway: SupabaseGateway) -> None:
        self.gateway = gateway
