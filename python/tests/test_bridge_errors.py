"""The bridge must never crash the host — bad requests return a value, not a trap."""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from model_language import _invoke, parse, render, validate  # noqa: E402


def test_unknown_op_returns_error_envelope() -> None:
    result = _invoke({"op": "nope"})
    assert "error" in result
    assert "unknown op" in result["error"]


def test_render_empty_template_degrades() -> None:
    assert render("")["text"] == ""


def test_render_wrong_data_shape_never_crashes() -> None:
    # `user` is a string, not an object — safe navigation yields empty, not a crash.
    out = render("{{ user.name }}", data={"user": "not-an-object"})
    assert isinstance(out, dict)
    assert out["text"] == ""


def test_validate_returns_diagnostics_and_estimate() -> None:
    result = validate("{{ user.zzz }}", schema=[{"path": "user.name", "type": "string"}])
    assert [d["code"] for d in result["diagnostics"]] == ["ML101"]
    assert isinstance(result["maxTokenEstimate"], int)


def test_parse_returns_ast() -> None:
    result = parse("Hi {{name}}")
    assert isinstance(result["ast"], list)
