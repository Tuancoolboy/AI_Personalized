from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "learning-data.json"


@lru_cache
def load_learning_data() -> dict[str, Any]:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Missing backend learning data snapshot: {DATA_PATH}"
        )
    return json.loads(DATA_PATH.read_text())


def get_modules_for_role(role_id: str, ai_level: int = 0) -> list[dict[str, Any]]:
    data = load_learning_data()
    modules = [m for m in data["modules"] if m["role_id"] == role_id]
    modules.sort(key=lambda item: item["sort_order"])
    if ai_level >= 5:
        modules = [m for m in modules if int(m["level"]) >= 2]
    return modules


def get_module_by_id(module_id: str) -> dict[str, Any] | None:
    data = load_learning_data()
    for module in data["modules"]:
        if module["id"] == module_id:
            return module
    return None


def get_quiz_for_role(role_id: str) -> list[dict[str, Any]]:
    data = load_learning_data()
    return list(data["quizzes"].get(role_id) or [])
