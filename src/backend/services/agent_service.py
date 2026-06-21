from __future__ import annotations

import hashlib
import json
from typing import Any

from backend.services.constants import REASON_CODE_LABELS, RECOMMENDER_ENGINE_VERSION, VALID_ROLES
from backend.services.learning_data import get_module_by_id, get_modules_for_role
from backend.services.openai_helpers import (
    chat_completion_json,
    chat_completion_text,
    get_openai_model,
    is_openai_configured,
)
from backend.services.service_base import ServiceBase
from backend.services.types import NativeSession

VALID_AHA_VISIBILITY = {"private", "department", "company"}

RECOMMENDER_WEIGHTS = {
    "roleMatch": 35,
    "assessmentGap": 25,
    "goalMatch": 20,
    "aiLevelFit": 15,
    "managerPriority": 5,
}


def _str(value: Any, max_len: int = 1000) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip()[:max_len]


def _fallback_aha_question(insight: str) -> str:
    topic = insight.rstrip(".!?…") or "điều bạn vừa nhận ra"
    return (
        f'Nếu áp dụng "{topic}" vào một việc thật trong tuần này, '
        "rào cản lớn nhất là gì — và bạn sẽ vượt qua nó thế nào?"
    )


class AgentService(ServiceBase):
    async def generate_aha_question(self, body: dict[str, Any]) -> str:
        insight = _str(body.get("insight"), 600)
        link_prior = _str(body.get("link_prior"), 600)
        next_action = _str(body.get("next_action"), 300)
        if not is_openai_configured():
            return _fallback_aha_question(insight)
        question = await chat_completion_text(
            "Bạn là gia sư AI cho nhân viên Việt Nam. Người học vừa hoàn thành một bài. "
            "Hãy hỏi lại ĐÚNG MỘT câu mở, ngắn gọn (≤30 từ), bằng tiếng Việt đời thường, "
            "đào sâu phản tư của họ để họ áp dụng vào việc thật. Chỉ trả về 1 câu hỏi, không lời dẫn.",
            f"Điều vừa hiểu ra: {insight}\nGiống/khác cách đang làm: {link_prior}\nSẽ thử khi nào: {next_action}",
        )
        return question or _fallback_aha_question(insight)

    async def save_aha_reflection(self, session: NativeSession, body: dict[str, Any]) -> dict[str, Any]:
        if session.mode == "demo":
            return {"persisted": False}
        insight = _str(body.get("insight"), 1000)
        module_id = _str(body.get("module_id"), 120)
        visibility = _str(body.get("visibility"), 20) or "private"
        if visibility not in VALID_AHA_VISIBILITY:
            visibility = "private"
        membership_rows = await self.gateway.select(
            "organization_members",
            query={
                "select": "organization_id",
                "user_id": f"eq.{session.user_id}",
                "limit": "1",
            },
        )
        org_id = membership_rows[0]["organization_id"] if membership_rows else None
        await self.gateway.insert(
            "aha_reflections",
            {
                "user_id": session.user_id,
                "organization_id": org_id,
                "module_id": module_id,
                "insight": insight,
                "link_prior": _str(body.get("link_prior"), 1000) or None,
                "next_action": _str(body.get("next_action"), 300) or None,
                "visibility": visibility,
                "ai_question": _str(body.get("ai_question"), 600) or None,
            },
        )
        return {"persisted": True}

    def _build_fallback_path(self, role_id: str, ai_level: int, completed_ids: list[str]) -> dict[str, Any]:
        modules = get_modules_for_role(role_id, ai_level)
        module_ids = [m["id"] for m in modules if m["id"] not in completed_ids][:8]
        return {
            "source": "fallback",
            "flow": "individual",
            "summary": "Lộ trình theo vị trí và mức AI hiện tại.",
            "groups": [
                {
                    "title": "Lộ trình theo vị trí",
                    "reason": "Bài học sát vai trò của bạn, đi từ cơ bản đến nâng cao.",
                    "moduleIds": module_ids,
                }
            ],
            "missingSkills": [],
            "fingerprint": hashlib.sha256(f"{role_id}:{ai_level}".encode()).hexdigest()[:16],
        }

    async def resolve_path_input(
        self,
        session: NativeSession,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        role_id = _str(body.get("roleId"), 40) or "khac"
        if role_id not in VALID_ROLES:
            role_id = "khac"
        ai_level = body.get("aiLevel")
        if not isinstance(ai_level, int):
            ai_level = 0
        completed = body.get("completedModuleIds")
        if not isinstance(completed, list):
            completed = []
        completed_ids = [str(x) for x in completed if isinstance(x, str)]
        if session.mode == "supabase":
            profile_rows = await self.gateway.select(
                "profiles",
                query={
                    "select": "role_id,ai_level",
                    "id": f"eq.{session.user_id}",
                    "limit": "1",
                },
            )
            if profile_rows:
                if not body.get("roleId") and profile_rows[0].get("role_id"):
                    role_id = str(profile_rows[0]["role_id"])
                if body.get("aiLevel") is None and profile_rows[0].get("ai_level") is not None:
                    ai_level = int(profile_rows[0]["ai_level"])
        return {"roleId": role_id, "aiLevel": ai_level, "completedModuleIds": completed_ids}

    def compute_path_fingerprint(self, input_data: dict[str, Any]) -> str:
        payload = json.dumps(input_data, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(payload.encode()).hexdigest()[:32]

    async def read_cached_path(self, user_id: str, fingerprint: str) -> dict[str, Any] | None:
        rows = await self.gateway.select(
            "learning_path_cache",
            query={
                "select": "fingerprint,path_json",
                "user_id": f"eq.{user_id}",
                "fingerprint": f"eq.{fingerprint}",
                "limit": "1",
            },
        )
        if not rows:
            return None
        path = rows[0].get("path_json")
        if isinstance(path, dict):
            path["fingerprint"] = fingerprint
            return path
        return None

    async def write_cached_path(self, user_id: str, fingerprint: str, path: dict[str, Any]) -> None:
        await self.gateway.upsert(
            "learning_path_cache",
            {
                "user_id": user_id,
                "fingerprint": fingerprint,
                "path_json": path,
            },
            on_conflict="user_id,fingerprint",
        )

    async def generate_learning_path(
        self,
        session: NativeSession,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        preview_skills = body.get("skillSlugs")
        if isinstance(preview_skills, list) and preview_skills:
            role_id = _str(body.get("roleId"), 40) or "khac"
            ai_level = int(body.get("aiLevel") or 0)
            path = self._build_fallback_path(role_id, ai_level, [])
            path["flow"] = "company"
            path["source"] = "preview"
            return {"path": path, "cached": False}

        force_refresh = body.get("forceRefresh") is True
        input_data = await self.resolve_path_input(session, body)
        fingerprint = self.compute_path_fingerprint(input_data)

        if not force_refresh and session.mode == "supabase":
            cached = await self.read_cached_path(session.user_id, fingerprint)
            if cached:
                return {"path": cached, "cached": True}

        role_id = str(input_data["roleId"])
        ai_level = int(input_data["aiLevel"])
        completed_ids = list(input_data["completedModuleIds"])
        modules = get_modules_for_role(role_id, ai_level)
        pool_text = "\n".join(
            f"- {m['id']} | {m.get('title', m['id'])} | level {m.get('level', 1)}"
            for m in modules
        )
        path = self._build_fallback_path(role_id, ai_level, completed_ids)
        path["fingerprint"] = fingerprint

        if is_openai_configured():
            parsed = await chat_completion_json(
                "Bạn trả về JSON hợp lệ, tiếng Việt.",
                f"Chọn và sắp xếp tối đa 8 module id từ danh sách:\n{pool_text}\n"
                f"Bài đã hoàn thành: {', '.join(completed_ids) or '(chưa có)'}\n"
                'Trả JSON: {"summary":"...","groups":[{"title":"...","reason":"...","moduleIds":["..."]}],"missingSkills":[]}',
            )
            if parsed and isinstance(parsed.get("groups"), list):
                path["summary"] = parsed.get("summary") or path["summary"]
                path["groups"] = parsed["groups"]
                path["missingSkills"] = parsed.get("missingSkills") or []
                path["source"] = "openai"

        if session.mode == "supabase":
            await self.write_cached_path(session.user_id, fingerprint, path)
        return {"path": path, "cached": False}

    async def grade_open_text(
        self,
        session: NativeSession,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        answer = _str(body.get("answer"), 8000)
        prompt = _str(body.get("prompt"), 4000)
        module_id = _str(body.get("moduleId"), 120)
        if len(answer) < 20:
            raise ValueError("VALIDATION:Câu trả lời cần ít nhất 20 ký tự để Agent 2 chấm.")
        if not prompt:
            raise ValueError("VALIDATION:Thiếu câu hỏi / yêu cầu bài (prompt).")
        if not is_openai_configured():
            raise ValueError("FORBIDDEN:Chưa cấu hình OPENAI_API_KEY.")

        role_id = _str(body.get("roleId"), 40) or "khac"
        module_title: str | None = None
        if module_id:
            mod = get_module_by_id(module_id)
            if mod:
                role_id = str(mod.get("role_id") or role_id)
                module_title = mod.get("title")

        if session.mode == "supabase" and not body.get("roleId"):
            profile_rows = await self.gateway.select(
                "profiles",
                query={"select": "role_id", "id": f"eq.{session.user_id}", "limit": "1"},
            )
            if profile_rows and profile_rows[0].get("role_id") in VALID_ROLES:
                role_id = str(profile_rows[0]["role_id"])

        system = (
            f"Bạn là Agent 2 chấm bài tự luận AI. Trả JSON: score, feedback, strengths[], improvements[], "
            f"rubricBreakdown[], evidence[], confidence, reviewStatus."
        )
        user = f"CÂU HỎI: {prompt}\n\nCÂU TRẢ LỜI:\n{answer}"
        if module_title:
            user = f"BÀI HỌC: {module_title}\n" + user
        parsed = await chat_completion_json(system, user)
        if not parsed:
            raise ValueError("INTERNAL:Agent 2 không chấm được bài tự luận.")

        score = int(parsed.get("score") or 0)
        review = {
            "score": max(0, min(100, score)),
            "feedback": str(parsed.get("feedback") or ""),
            "strengths": parsed.get("strengths") or [],
            "improvements": parsed.get("improvements") or [],
            "grading": {
                "rubricBreakdown": parsed.get("rubricBreakdown") or [],
                "evidence": parsed.get("evidence") or [],
                "confidence": parsed.get("confidence") or 0.7,
                "reviewStatus": parsed.get("reviewStatus") or "auto-approved",
                "rubricVersion": "1.0",
                "model": get_openai_model(),
            },
        }

        grading_result_id: str | None = None
        grading_persisted = False
        if session.mode == "supabase":
            membership_rows = await self.gateway.select(
                "organization_members",
                query={"select": "organization_id", "user_id": f"eq.{session.user_id}", "limit": "1"},
            )
            org_id = membership_rows[0]["organization_id"] if membership_rows else None
            try:
                rows = await self.gateway.insert(
                    "grading_results",
                    {
                        "user_id": session.user_id,
                        "organization_id": org_id,
                        "module_id": module_id or None,
                        "score": review["score"],
                        "feedback": review["feedback"],
                        "review_status": review["grading"]["reviewStatus"],
                        "rubric_breakdown": review["grading"]["rubricBreakdown"],
                        "evidence": review["grading"]["evidence"],
                        "confidence": review["grading"]["confidence"],
                        "kind": "open-text",
                    },
                    prefer="return=representation",
                )
                if rows:
                    grading_result_id = rows[0].get("id")
                    grading_persisted = True
            except Exception:
                grading_persisted = False

        return {
            "result": review,
            "gradingResultId": grading_result_id,
            "gradingPersisted": grading_persisted,
        }

    def _build_module_catalog(self) -> list[dict[str, Any]]:
        catalog: list[dict[str, Any]] = []
        sort_order = 0
        for role_id in VALID_ROLES:
            for mod in get_modules_for_role(role_id, 5):
                sort_order += 1
                catalog.append(
                    {
                        "id": mod["id"],
                        "roleId": role_id,
                        "level": mod.get("level", 1),
                        "sortOrder": sort_order,
                        "scope": "global",
                        "status": "published",
                        "goalTags": mod.get("goal_tags") or [],
                        "prerequisites": mod.get("prerequisites") or [],
                    }
                )
        return catalog

    def _rank_modules(self, input_data: dict[str, Any]) -> list[dict[str, Any]]:
        role_id = input_data["roleId"]
        ai_level = input_data["aiLevel"]
        mastered = set(input_data.get("masteredModuleIds") or [])
        gap_ids = set(input_data.get("assessmentGapModuleIds") or [])
        priority_ids = set(input_data.get("managerPriorityModuleIds") or [])
        limit = int(input_data.get("limit") or 8)

        ranked: list[dict[str, Any]] = []
        for mod in input_data["modules"]:
            if mod["status"] != "published":
                continue
            if mod["id"] in mastered:
                continue
            if mod["roleId"] not in {role_id, "common"}:
                continue
            if input_data.get("skipBasicModules") and mod["level"] <= 1 and mod["roleId"] != "common":
                continue
            breakdown: dict[str, int] = {}
            reason_codes = ["prerequisite-ready"]
            if mod["roleId"] == role_id:
                breakdown["roleMatch"] = RECOMMENDER_WEIGHTS["roleMatch"]
                reason_codes.append("role-match")
            if mod["id"] in gap_ids:
                breakdown["assessmentGap"] = RECOMMENDER_WEIGHTS["assessmentGap"]
                reason_codes.append("assessment-gap")
            if mod["id"] in priority_ids:
                breakdown["managerPriority"] = RECOMMENDER_WEIGHTS["managerPriority"]
                reason_codes.append("manager-priority")
            breakdown["aiLevelFit"] = RECOMMENDER_WEIGHTS["aiLevelFit"] // 2
            reason_codes.append("level-fit")
            score = sum(breakdown.values())
            ranked.append(
                {
                    "moduleId": mod["id"],
                    "score": score,
                    "reasonCodes": list(dict.fromkeys(reason_codes)),
                    "breakdown": breakdown,
                    "sortOrder": mod["sortOrder"],
                }
            )
        ranked.sort(key=lambda item: (-item["score"], item["sortOrder"]))
        return ranked[:limit]

    async def recommend_modules(
        self,
        session: NativeSession,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        role_id = _str(body.get("roleId"), 40) or "khac"
        ai_level = int(body.get("aiLevel") or 0)
        organization_id: str | None = None
        mastered_module_ids: list[str] = []
        manager_priority_module_ids: list[str] = []

        if session.mode == "supabase":
            profile_rows = await self.gateway.select(
                "profiles",
                query={"select": "role_id,ai_level", "id": f"eq.{session.user_id}", "limit": "1"},
            )
            if profile_rows:
                if not body.get("roleId") and profile_rows[0].get("role_id"):
                    role_id = str(profile_rows[0]["role_id"])
                if body.get("aiLevel") is None and profile_rows[0].get("ai_level") is not None:
                    ai_level = int(profile_rows[0]["ai_level"])
            membership_rows = await self.gateway.select(
                "organization_members",
                query={"select": "organization_id", "user_id": f"eq.{session.user_id}", "limit": "1"},
            )
            if membership_rows:
                organization_id = membership_rows[0]["organization_id"]
            progress_rows = await self.gateway.select(
                "module_progress",
                query={
                    "select": "module_id,status",
                    "user_id": f"eq.{session.user_id}",
                    "status": "eq.hoan-thanh",
                },
            )
            mastered_module_ids = [str(r["module_id"]) for r in progress_rows if r.get("module_id")]

        limit = min(20, max(1, int(body.get("limit") or 8)))
        modules = self._build_module_catalog()
        input_data = {
            "roleId": role_id,
            "aiLevel": ai_level,
            "masteredModuleIds": mastered_module_ids,
            "assessmentGapModuleIds": [],
            "managerPriorityModuleIds": manager_priority_module_ids,
            "skipBasicModules": ai_level >= 5,
            "modules": modules,
            "limit": limit,
        }
        recommendations = self._rank_modules(input_data)
        enriched = []
        for item in recommendations:
            mod = get_module_by_id(item["moduleId"])
            title = mod.get("title") if mod else item["moduleId"]
            reason_labels = [REASON_CODE_LABELS.get(code, code) for code in item["reasonCodes"]]
            enriched.append(
                {
                    **item,
                    "reasonLabels": reason_labels,
                    "summary": f"Gợi ý học {title} — {', '.join(reason_labels[:2])}",
                }
            )

        if body.get("persist") is True and session.mode == "supabase":
            rows = [
                {
                    "organization_id": organization_id,
                    "user_id": session.user_id,
                    "candidate_module_id": item["moduleId"],
                    "score": item["score"],
                    "reason_codes": item["reasonCodes"],
                    "engine_version": RECOMMENDER_ENGINE_VERSION,
                }
                for item in enriched
            ]
            try:
                await self.gateway.insert("learning_recommendations", rows)
            except Exception:
                pass

        top = enriched[0] if enriched else None
        return {
            "engineVersion": RECOMMENDER_ENGINE_VERSION,
            "roleId": role_id,
            "aiLevel": ai_level,
            "managerPriorityModuleIds": manager_priority_module_ids,
            "topRecommendation": (
                {
                    "moduleId": top["moduleId"],
                    "score": top["score"],
                    "reasonLabels": top["reasonLabels"],
                    "summary": top["summary"],
                }
                if top
                else None
            ),
            "recommendations": enriched,
        }


_agent_service: AgentService | None = None


def get_agent_service() -> AgentService:
    global _agent_service
    if _agent_service is None:
        from backend.services.supabase_gateway import get_supabase_gateway

        _agent_service = AgentService(get_supabase_gateway())
    return _agent_service
