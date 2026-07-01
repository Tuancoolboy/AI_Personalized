from __future__ import annotations

from datetime import UTC, datetime
import re

DEMO_SESSION_COOKIE = "ai_troly_demo_session"
VALID_ROLES = {"kinh-doanh", "ke-toan", "marketing", "van-hanh", "khac", "nhan-su"}
VALID_PROGRESS_STATUS = {"chua-hoc", "dang-hoc", "hoan-thanh"}
ALLOWED_EVENTS = {
    "onboarding_complete",
    "lesson_view",
    "lesson_complete",
    "tutor_message_sent",
    "quiz_submitted",
    "quiz_passed",
    "journal_logged",
    "user_return",
    "landing_page_view",
    "lead_form_submit",
    "cta_click",
}
MCQ_PASS_SCORE = 70
LEGACY_DEPARTMENT_IDS = {"kinh-doanh", "ke-toan", "marketing", "van-hanh", "khac"}
DEFAULT_ORGANIZATION_NAME = "Tổ chức mặc định"
MODULE_COUNT_PER_ROLE = 6
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
SINGLE_ORGANIZATION_CONFLICT_MESSAGE = (
    "Email này đã thuộc công ty khác. Một tài khoản chỉ được tham gia một công ty."
)
DEFAULT_PRIMARY_TOOL = "claude"
VALID_PRIMARY_TOOLS = {"claude", "chatgpt", "gemini", "copilot"}
INVITE_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{32,}$")
RECOMMENDER_ENGINE_VERSION = "1.0.0"
REASON_CODE_LABELS = {
    "role-match": "Phù hợp vai trò công việc của bạn",
    "assessment-gap": "Bù khoảng trống từ bài đánh giá đầu vào",
    "goal-alignment": "Khớp mục tiêu học tập bạn chọn",
    "level-fit": "Đúng mức độ AI hiện tại",
    "manager-priority": "Quản lý ưu tiên module này",
    "prerequisite-ready": "Đã hoàn thành bài tiên quyết",
    "common-foundation": "Nền tảng chung cho mọi nhân viên",
}
DEFAULT_CONVERSATION_TITLES = {
    "manager": "Trợ lý quản lý",
    "employee": "Trợ lý học tập",
}

DEMO_MANAGER_RECOMMENDATIONS = [
    {
        "userId": "demo-user-1",
        "employeeName": "Nguyễn Văn A",
        "department": "Kinh doanh",
        "roleId": "kinh-doanh",
        "hasSnapshot": True,
        "snapshotAt": datetime.now(UTC).isoformat(),
        "engineVersion": RECOMMENDER_ENGINE_VERSION,
        "topRecommendation": {
            "moduleId": "kinh-doanh-m2",
            "moduleTitle": "Viết email chốt sale bằng AI",
            "score": 88,
            "reasonLabels": [
                "Phù hợp vai trò công việc của bạn",
                "Đúng mức độ AI hiện tại",
            ],
        },
        "recommendations": [
            {
                "moduleId": "kinh-doanh-m2",
                "moduleTitle": "Viết email chốt sale bằng AI",
                "score": 88,
                "reasonLabels": [
                    "Phù hợp vai trò công việc của bạn",
                    "Đúng mức độ AI hiện tại",
                ],
            },
            {
                "moduleId": "kinh-doanh-m3",
                "moduleTitle": "Soạn kịch bản gọi điện / chat Zalo",
                "score": 74,
                "reasonLabels": ["Phù hợp vai trò công việc của bạn"],
            },
        ],
        "assignmentStatus": "none",
    },
    {
        "userId": "demo-user-2",
        "employeeName": "Trần Thị B",
        "department": "Marketing",
        "roleId": "marketing",
        "hasSnapshot": False,
        "snapshotAt": None,
        "engineVersion": None,
        "topRecommendation": None,
        "recommendations": [],
        "assignmentStatus": "none",
    },
]

DEMO_MANAGER_GRADING_QUEUE = [
    {
        "id": "demo-grade-1",
        "userId": "demo-user-1",
        "employeeName": "Nguyễn Văn A",
        "moduleId": "kinh-doanh-m2",
        "moduleTitle": "Viết email chốt sale bằng AI",
        "score": 68,
        "confidence": 0.62,
        "reviewStatus": "manager-review",
        "feedback": "Bài có dùng AI nhưng email còn chung chung, thiếu thông tin khách hàng cụ thể.",
        "rubricBreakdown": [
            {
                "criterion": "Đã dùng AI / nội dung liên quan bài học",
                "points": 30,
                "maxPoints": 40,
                "note": "Có output AI",
            },
            {
                "criterion": "Phù hợp vai trò kinh doanh",
                "points": 22,
                "maxPoints": 30,
                "note": "Thiếu CTA rõ",
            },
        ],
        "evidence": ["Thấy email mẫu chưa có tên khách"],
        "strengths": ["Đã thử prompt theo bài học"],
        "improvements": ["Thêm tên công ty và lợi ích cụ thể"],
        "submittedAt": datetime.now(UTC).isoformat(),
        "model": "gpt-4o-mini",
    }
]
