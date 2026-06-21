from backend.services import openai_helpers


def test_strip_leading_assistant_greeting_removes_prefix():
    text = "Chào bạn! Em sẽ hướng dẫn theo từng bước."

    assert openai_helpers.strip_leading_assistant_greeting(text) == "Em sẽ hướng dẫn theo từng bước."


def test_get_cached_answer_strips_leading_greeting(monkeypatch):
    monkeypatch.setitem(
        openai_helpers.CACHED_ANSWERS,
        ("khac", "hello"),
        "Chào bạn! Em trả lời luôn đây.",
    )

    assert openai_helpers.get_cached_answer("khac", "hello") == "Em trả lời luôn đây."


def test_build_prompts_remind_single_greeting():
    employee_prompt = openai_helpers.build_employee_system_prompt("marketing", "Lan")
    manager_prompt = openai_helpers.build_manager_system_prompt("Minh")

    assert "Chỉ chào một lần" in employee_prompt
    assert "Chỉ chào một lần" in manager_prompt
