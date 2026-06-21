from __future__ import annotations

import base64
import json
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from backend.services.constants import VALID_ROLES
from backend.services.learning_data import get_module_by_id
from backend.services.openai_helpers import chat_completion_json, get_openai_model, is_openai_configured
from backend.services.service_base import ServiceBase
from backend.services.types import NativeSession

MAX_IMAGES_PER_SUBMIT = 5
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_ANSWER_CHARS = 6000
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
PRACTICE_BUCKET = "practice-submissions"


def _estimate_base64_bytes(base64_data: str) -> int:
    padding = 2 if base64_data.endswith("==") else 1 if base64_data.endswith("=") else 0
    return (len(base64_data) * 3) // 4 - padding


class PracticeService(ServiceBase):
    def _parse_images(self, body: dict[str, Any]) -> list[dict[str, str]] | None:
        images_payload = body.get("images")
        parsed: list[dict[str, str]] = []
        if isinstance(images_payload, list):
            for item in images_payload:
                if not isinstance(item, dict):
                    continue
                raw = str(item.get("imageBase64") or "").strip()
                mime = str(item.get("mimeType") or "image/png").strip()
                if not raw or mime not in ALLOWED_MIME:
                    continue
                if _estimate_base64_bytes(raw) > MAX_IMAGE_BYTES:
                    return None
                parsed.append({"base64": raw, "mimeType": mime})
            return parsed if parsed else []
        legacy = str(body.get("imageBase64") or "").strip()
        legacy_mime = str(body.get("mimeType") or "image/png").strip()
        if not legacy:
            return []
        if legacy_mime not in ALLOWED_MIME or _estimate_base64_bytes(legacy) > MAX_IMAGE_BYTES:
            return None
        return [{"base64": legacy, "mimeType": legacy_mime}]

    def _has_image_input(self, body: dict[str, Any]) -> bool:
        if isinstance(body.get("images"), list) and body["images"]:
            return True
        return bool(str(body.get("imageBase64") or "").strip())

    async def _signed_urls(self, paths: list[str]) -> list[str]:
        if not paths:
            return []
        return await self.gateway.create_signed_storage_urls(PRACTICE_BUCKET, paths)

    async def list_submissions(self, user_id: str, module_id: str) -> list[dict[str, Any]]:
        rows = await self.gateway.select(
            "module_practice_submissions",
            query={
                "select": "id,score,feedback,strengths,improvements,image_paths,created_at",
                "user_id": f"eq.{user_id}",
                "module_id": f"eq.{module_id}",
                "order": "created_at.desc",
                "limit": "20",
            },
        )
        return rows

    async def get_practice_history(self, user_id: str, module_id: str) -> dict[str, Any]:
        rows = await self.list_submissions(user_id, module_id)
        history = []
        for row in rows:
            image_urls = await self._signed_urls(list(row.get("image_paths") or []))
            history.append(
                {
                    "id": row["id"],
                    "score": row.get("score"),
                    "feedback": row.get("feedback"),
                    "strengths": row.get("strengths") or [],
                    "improvements": row.get("improvements") or [],
                    "imageUrls": image_urls,
                    "imageCount": len(row.get("image_paths") or []),
                    "reviewedAt": row.get("created_at"),
                }
            )
        latest = history[0] if history else None
        scores = [int(r.get("score") or 0) for r in rows]
        return {
            "review": latest,
            "history": history,
            "stats": {
                "attemptCount": len(rows),
                "bestScore": max(scores) if scores else 0,
                "latestScore": latest["score"] if latest else None,
            },
        }

    def _demo_review(self, mod: dict[str, Any]) -> dict[str, Any]:
        return {
            "score": 72,
            "feedback": f"Bài thực hành cho \"{mod.get('title', 'bài học')}\" có dấu hiệu đã thử AI. "
            "Hãy chỉnh lại cho sát tình huống công việc của bạn.",
            "strengths": ["Đã có output thử nghiệm", "Nội dung liên quan bài học"],
            "improvements": ["Thêm chi tiết khách hàng cụ thể", "Chỉnh CTA rõ hơn"],
            "rubricScores": [],
        }

    async def _grade_submission(
        self,
        role_id: str,
        mod: dict[str, Any],
        images: list[dict[str, str]],
        answer_text: str,
    ) -> dict[str, Any] | None:
        if not is_openai_configured():
            return None
        from openai import AsyncOpenAI

        from backend.config import get_settings
        from backend.services.openai_helpers import ROLE_LABEL

        client = AsyncOpenAI(api_key=get_settings().openai_api_key)
        label = ROLE_LABEL.get(role_id, ROLE_LABEL["khac"])
        system = (
            f"Bạn chấm bài thực hành AI cho {label}. Trả JSON: score, feedback, strengths[], improvements[]."
        )
        user_parts: list[Any] = [
            {
                "type": "text",
                "text": f"Bài: {mod.get('title')}\nĐáp án text:\n{answer_text or '(không có)'}",
            }
        ]
        for img in images[:MAX_IMAGES_PER_SUBMIT]:
            user_parts.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{img['mimeType']};base64,{img['base64']}",
                        "detail": "low",
                    },
                }
            )
        response = await client.chat.completions.create(
            model=get_openai_model(),
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_parts},
            ],
            max_tokens=900,
        )
        raw = response.choices[0].message.content or ""
        try:
            parsed = json.loads(raw)
            score = int(parsed.get("score") or 0)
            return {
                "score": max(0, min(100, score)),
                "feedback": str(parsed.get("feedback") or ""),
                "strengths": parsed.get("strengths") or [],
                "improvements": parsed.get("improvements") or [],
                "rubricScores": parsed.get("rubricScores") or [],
            }
        except (json.JSONDecodeError, TypeError, ValueError):
            return None

    async def _upload_images(
        self,
        user_id: str,
        module_id: str,
        entry_id: str,
        images: list[dict[str, str]],
    ) -> list[str]:
        paths: list[str] = []
        for index, img in enumerate(images[:MAX_IMAGES_PER_SUBMIT]):
            ext = img["mimeType"].split("/")[-1]
            path = f"{user_id}/{module_id}/{entry_id}-{index}.{ext}"
            content = base64.b64decode(img["base64"])
            await self.gateway.upload_storage_object(
                PRACTICE_BUCKET,
                path,
                content,
                content_type=img["mimeType"],
            )
            paths.append(path)
        return paths

    async def submit_practice(
        self,
        session: NativeSession,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        module_id = str(body.get("moduleId") or "").strip()
        if not module_id:
            raise ValueError("VALIDATION:Thiếu moduleId.")
        answer_text = str(body.get("answerText") or "").strip()[:MAX_ANSWER_CHARS]
        images = self._parse_images(body)
        if images is None:
            raise ValueError("VALIDATION:Ảnh không hợp lệ hoặc quá lớn (tối đa 5MB/ảnh).")
        if len(images) > MAX_IMAGES_PER_SUBMIT:
            raise ValueError(f"VALIDATION:Tối đa {MAX_IMAGES_PER_SUBMIT} ảnh mỗi lần nộp.")
        if not answer_text and not images:
            raise ValueError("VALIDATION:Hãy dán đáp án hoặc nộp ít nhất 1 ảnh kết quả.")

        mod = get_module_by_id(module_id)
        if not mod:
            raise ValueError("NOT_FOUND:Không tìm thấy bài học.")
        role_id = str(mod.get("role_id") or "khac")
        if role_id not in VALID_ROLES:
            raise ValueError("VALIDATION:Vai trò bài học không hợp lệ.")

        review = await self._grade_submission(role_id, mod, images, answer_text)
        if not review:
            review = self._demo_review(mod)

        entry_id = str(uuid4())
        image_paths: list[str] = []
        image_urls: list[str] = []
        if session.mode == "supabase" and self.gateway.is_configured():
            try:
                image_paths = await self._upload_images(session.user_id, module_id, entry_id, images)
                await self.gateway.insert(
                    "module_practice_submissions",
                    {
                        "id": entry_id,
                        "user_id": session.user_id,
                        "module_id": module_id,
                        "score": review["score"],
                        "feedback": review["feedback"],
                        "strengths": review["strengths"],
                        "improvements": review["improvements"],
                        "image_paths": image_paths,
                    },
                )
                image_urls = await self._signed_urls(image_paths)
            except Exception:
                pass

        entry = {
            "id": entry_id,
            "score": review["score"],
            "feedback": review["feedback"],
            "strengths": review["strengths"],
            "improvements": review["improvements"],
            "rubricScores": review.get("rubricScores") or [],
            "imageUrls": image_urls,
            "imageCount": len(images),
            "reviewedAt": datetime.now(UTC).isoformat(),
        }
        return {"review": entry, "entry": entry}


_practice_service: PracticeService | None = None


def get_practice_service() -> PracticeService:
    global _practice_service
    if _practice_service is None:
        from backend.services.supabase_gateway import get_supabase_gateway

        _practice_service = PracticeService(get_supabase_gateway())
    return _practice_service
