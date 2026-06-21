from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class NativeSession:
    mode: str
    user_id: str
    email: str | None = None
    is_manager: bool = False
