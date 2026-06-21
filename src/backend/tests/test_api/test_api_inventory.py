"""Ensure every native API route is registered on the FastAPI app."""

from backend.main import app

EXPECTED_ROUTES: dict[tuple[str, str], str] = {
    ("GET", "/health"): "health",
    ("GET", "/api/v1/status"): "backend_status",
    ("POST", "/api/events"): "post_event",
    ("GET", "/api/profile"): "get_profile",
    ("PUT", "/api/profile"): "put_profile",
    ("GET", "/api/progress"): "get_progress",
    ("POST", "/api/progress"): "post_progress",
    ("GET", "/api/nhat-ky"): "get_logs",
    ("POST", "/api/nhat-ky"): "post_logs",
    ("POST", "/api/leads"): "post_lead",
    ("GET", "/api/leads"): "get_leads",
    ("GET", "/api/modules"): "get_modules",
    ("GET", "/api/modules/{module_id}"): "get_module",
    ("GET", "/api/quiz-results"): "get_quiz_results",
    ("POST", "/api/quiz-results"): "post_quiz_results",
    ("GET", "/api/practice-review"): "get_practice_review",
    ("POST", "/api/practice-review"): "post_practice_review",
    ("GET", "/api/chat/history"): "get_chat_history",
    ("GET", "/api/chat/conversations"): "get_chat_conversations",
    ("DELETE", "/api/chat/conversations/{conversation_id}"): "delete_chat_conversation",
    ("POST", "/api/chat"): "post_chat",
    ("POST", "/api/aha"): "post_aha",
    ("POST", "/api/agent/lo-trinh"): "post_agent_lo_trinh",
    ("POST", "/api/agents/grader"): "post_agents_grader",
    ("POST", "/api/agents/recommender"): "post_agents_recommender",
    ("POST", "/api/organizations"): "post_organizations",
    ("GET", "/api/organizations/current"): "get_organizations_current",
    ("PATCH", "/api/organizations/current"): "patch_organizations_current",
    ("GET", "/api/organizations/{slug}/public"): "get_organizations_public",
    ("POST", "/api/member/sync-department"): "post_member_sync_department",
    ("GET", "/api/org-settings"): "get_org_settings",
    ("PUT", "/api/org-settings"): "put_org_settings",
    ("GET", "/api/manager/team"): "get_manager_team",
    ("POST", "/api/manager/team"): "post_manager_team",
    ("GET", "/api/manager/invite-links"): "get_manager_invite_links",
    ("POST", "/api/manager/invite-links"): "post_manager_invite_links",
    ("POST", "/api/manager/invite-links/rotate"): "post_manager_invite_links_rotate",
    ("GET", "/api/manager/recommendations"): "get_manager_recommendations",
    ("GET", "/api/manager/agent-health"): "get_manager_agent_health",
    ("GET", "/api/manager/grading"): "get_manager_grading",
    ("PATCH", "/api/manager/grading/{result_id}/review"): "patch_manager_grading_review",
    ("GET", "/moi/{token}/accept"): "get_invite_accept",
    ("POST", "/moi/{token}/accept"): "post_invite_accept",
}


def _registered_routes() -> set[tuple[str, str]]:
    registered: set[tuple[str, str]] = set()
    for route in app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", None)
        if not methods or not path:
            continue
        for method in methods:
            if method in {"HEAD", "OPTIONS"}:
                continue
            registered.add((method, path))
    return registered


def test_all_native_api_routes_are_registered():
    registered = _registered_routes()
    missing = [key for key in EXPECTED_ROUTES if key not in registered]
    assert not missing, f"Missing routes: {missing}"
