from __future__ import annotations

import json
import os
import re
from typing import Any

from openai import AsyncOpenAI

from backend.config import get_settings

ROLE_LABEL: dict[str, str] = {
    "kinh-doanh": "Nhân viên kinh doanh / bán hàng",
    "ke-toan": "Nhân viên kế toán",
    "marketing": "Nhân viên marketing",
    "van-hanh": "Nhân viên vận hành",
    "khac": "Nhân viên văn phòng",
}

SAFETY_WARNING = (
    "⚠ **Em phát hiện thông tin có thể nhạy cảm** (số điện thoại / tài khoản / mật khẩu) "
    "trong câu hỏi. Nhắc anh/chị: không nên đưa dữ liệu cá nhân của khách lên công cụ AI công cộng. "
    "Hãy mô tả tình huống chung — không kèm thông tin định danh — để em trả lời an toàn hơn."
)

SAFETY_TRIGGERS = [
    re.compile(r"\b\d{9,13}\b"),
    re.compile(r"STK|tài khoản|account number", re.I),
    re.compile(r"mật khẩu|password", re.I),
    re.compile(r"CMND|CCCD", re.I),
]

CACHED_ANSWERS: dict[tuple[str, str], str] = {
    ("kinh-doanh", "ai là gì"): (
        "AI (trí tuệ nhân tạo) giúp anh/chị viết email chốt sale, soạn kịch bản gọi điện nhanh hơn. "
        "Ví dụ: dán thông tin khách → nhờ AI gợi ý 3 câu mở đầu, rồi anh/chị chỉnh lại cho sát tình huống."
    ),
    ("marketing", "ai là gì"): (
        "AI giúp em lên ý tưởng nội dung, viết caption, phác A/B test nhanh. "
        "Ví dụ: mô tả sản phẩm + đối tượng → AI gợi ý 5 hook, em chọn và chỉnh giọng thương hiệu."
    ),
}

LEADING_ASSISTANT_GREETING_PATTERN = re.compile(
    r"^(?:\ufeff|\s)*(?:(?:xin\s+)?chào)(?:\s+(?:bạn|em|anh|chị|anh chị|các bạn|các anh chị|quý khách|mọi người|mọi người ơi|cô|chú|ông|bà)(?:\s+[^\s!,.?:;]{1,24})*)?[\s]*[!,.?:;—–-]+\s*",
    re.IGNORECASE | re.UNICODE,
)


def is_openai_configured() -> bool:
    settings = get_settings()
    return bool(settings.openai_api_key and settings.openai_api_key.strip())


def get_openai_model() -> str:
    return get_settings().model_name


def get_rate_limit_per_day() -> int:
    return int(os.getenv("RATE_LIMIT_PER_DAY", "30"))


def get_openai_client() -> AsyncOpenAI | None:
    if not is_openai_configured():
        return None
    return AsyncOpenAI(api_key=get_settings().openai_api_key)


def get_safety_warning(text: str) -> str | None:
    if any(trigger.search(text) for trigger in SAFETY_TRIGGERS):
        return SAFETY_WARNING
    return None


def strip_leading_assistant_greeting(text: str) -> str:
    output = text.lstrip("\ufeff").lstrip()
    while True:
        stripped = LEADING_ASSISTANT_GREETING_PATTERN.sub("", output, count=1)
        if stripped == output:
            break
        output = stripped.lstrip()
    return output if output.strip() else text


def get_cached_answer(role_id: str, message: str) -> str | None:
    key = (role_id, message.strip().lower())
    answer = CACHED_ANSWERS.get(key)
    return strip_leading_assistant_greeting(answer) if answer else None


def get_fallback_answer(message: str, role_id: str) -> dict[str, Any]:
    label = ROLE_LABEL.get(role_id, ROLE_LABEL["khac"])
    return {
        "answer": strip_leading_assistant_greeting(
            (
                f"Em là Trợ lý AI cho {label}. Anh/chị hỏi về \"{message[:80]}\" — "
                "em có thể hướng dẫn prompt, công cụ và cách áp dụng vào việc hằng ngày. "
                "Hãy mô tả cụ thể việc anh/chị đang làm để em gợi ý sát hơn nhé."
            )
        ),
        "safety": get_safety_warning(message),
    }


def build_employee_system_prompt(role_id: str, full_name: str = "") -> str:
    label = ROLE_LABEL.get(role_id, ROLE_LABEL["khac"])
    display = full_name.strip() or "bạn"
    return f"""Bạn là "Trợ lý AI" — gia sư riêng cho {label} tại doanh nghiệp Việt Nam.
Xưng "em", gọi user là "{display}".
NGUYÊN TẮC:
1. Trả lời tiếng Việt đời thường, ví dụ đúng nghề {label}.
2. Chỉ trả lời về AI trong công việc, công cụ AI, prompt, an toàn dữ liệu.
3. Cảnh báo nếu user paste dữ liệu nhạy cảm.
4. Không bịa — không chắc thì nói rõ.
5. Ngắn gọn, có cấu trúc, tối đa ~250 từ trừ khi user yêu cầu chi tiết.
6. Chỉ chào một lần khi mở session mới; các lượt sau không mở đầu bằng "Chào bạn" hay "Xin chào"."""


def build_manager_system_prompt(full_name: str = "") -> str:
    display = full_name.strip() or "bạn"
    return f"""Bạn là Trợ lý AI cho quản lý doanh nghiệp Việt Nam, hỗ trợ {display}.
Xưng "em". Tập trung phân tích đội học, gợi ý hành động quản lý, không làm hộ báo cáo hoàn chỉnh.
Chỉ chào một lần khi mở session mới; các lượt sau không mở đầu bằng "Chào bạn" hay "Xin chào"."""


async def chat_completion_json(system: str, user: str, *, max_tokens: int = 900) -> dict[str, Any] | None:
    client = get_openai_client()
    if not client:
        return None
    response = await client.chat.completions.create(
        model=get_openai_model(),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        temperature=0.3,
    )
    raw = response.choices[0].message.content or ""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


async def chat_completion_text(
    system: str,
    user: str,
    *,
    max_tokens: int = 80,
    temperature: float = 0.7,
) -> str | None:
    client = get_openai_client()
    if not client:
        return None
    response = await client.chat.completions.create(
        model=get_openai_model(),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return (response.choices[0].message.content or "").strip() or None
