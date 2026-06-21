from backend.agents.tools.example_tool import _MAX_EVAL_DEPTH, calculate


def test_calculate_basic():
    assert calculate.invoke({"expression": "2 + 3 * 4"}) == "14"


def test_calculate_rejects_deep_nesting():
    # (1+(1+(1+...))) vượt _MAX_EVAL_DEPTH
    depth = _MAX_EVAL_DEPTH + 5
    expr = "1" + "+1" * depth
    result = calculate.invoke({"expression": expr})
    assert "Lỗi tính toán" in result
