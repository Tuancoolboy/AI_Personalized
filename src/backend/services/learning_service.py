from __future__ import annotations

from typing import Any

from backend.services.constants import MCQ_PASS_SCORE
from backend.services.learning_data import get_module_by_id, get_modules_for_role, get_quiz_for_role
from backend.services.service_base import ServiceBase

class LearningService(ServiceBase):
        async def fetch_modules_for_role(self, role_id: str, ai_level: int = 0) -> list[dict[str, Any]]:
            if self.gateway.is_configured():
                rows = await self.gateway.select(
                    "learning_modules",
                    query={
                        "select": "*",
                        "role_id": f"eq.{role_id}",
                        "order": "sort_order.asc",
                    },
                )
                if rows:
                    modules = rows
                    if ai_level >= 5:
                        modules = [m for m in modules if int(m.get("level") or 0) >= 2]
                    return modules
            return get_modules_for_role(role_id, ai_level)

        async def fetch_module_by_id(self, module_id: str) -> dict[str, Any] | None:
            if self.gateway.is_configured():
                rows = await self.gateway.select(
                    "learning_modules",
                    query={
                        "select": "*",
                        "id": f"eq.{module_id}",
                        "limit": "1",
                    },
                )
                if rows:
                    return rows[0]
            return get_module_by_id(module_id)

        async def get_quiz_results(self, user_id: str) -> dict[str, Any]:
            rows = await self.gateway.select(
                "quiz_results",
                query={
                    "select": "id,role_id,score,passed,created_at",
                    "user_id": f"eq.{user_id}",
                    "order": "created_at.desc",
                    "limit": "50",
                },
            )
            results = [
                {
                    "id": row["id"],
                    "roleId": row["role_id"],
                    "score": int(row["score"]),
                    "passed": bool(row.get("passed")),
                    "createdAt": row["created_at"],
                }
                for row in rows
            ]
            average = round(sum(r["score"] for r in results) / len(results)) if results else 0
            best = max((r["score"] for r in results), default=0)
            return {
                "averageScore": average,
                "bestScore": best,
                "count": len(results),
                "results": results,
            }

        async def create_quiz_result(
            self,
            user_id: str,
            *,
            role_id: str,
            module_id: str | None,
            score: int,
        ) -> dict[str, Any]:
            await self.gateway.insert(
                "quiz_results",
                {
                    "id": str(uuid4()),
                    "user_id": user_id,
                    "role_id": role_id,
                    "module_id": module_id,
                    "score": score,
                },
            )
            return {"score": score, "passed": score >= MCQ_PASS_SCORE}

        def grade_mcq_quiz(self, role_id: str, answers: list[int]) -> dict[str, Any] | None:
            questions = get_quiz_for_role(role_id)
            if not questions or len(answers) != len(questions):
                return None
            correct_count = 0
            improvements: list[str] = []
            for index, question in enumerate(questions):
                selected = answers[index]
                options = question["options"]
                valid = isinstance(selected, int) and 0 <= selected < len(options)
                is_correct = valid and selected == question["correctIndex"]
                if is_correct:
                    correct_count += 1
                else:
                    improvements.append(question["explanation"])
            question_count = len(questions)
            score = round((correct_count / question_count) * 100)
            return {
                "score": score,
                "correctCount": correct_count,
                "questionCount": question_count,
                "reviewStatus": "auto-approved" if score >= 75 else "needs-revision" if score < 60 else "manager-review",
                "gradingResultId": None,
                "gradingPersisted": False,
                "passed": score >= MCQ_PASS_SCORE,
                "feedback": (
                    f"Bạn trả lời đúng {correct_count}/{question_count} câu — đạt ngưỡng kiểm tra."
                    if score >= MCQ_PASS_SCORE
                    else f"Bạn trả lời đúng {correct_count}/{question_count} câu — cần ≥{MCQ_PASS_SCORE}% để pass."
                ),
                "improvements": improvements[:3],
            }

