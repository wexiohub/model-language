"""Runs the language-neutral conformance fixtures through the WASM component.

Every fixture in ``conformance/cases/*.json`` is executed against the Python
bindings and checked against the same expectations the TypeScript runner uses
(``test/golden/conformance.test.ts``). Passing this proves the Python bridge is
behaviourally identical to the canonical engine.
"""

from __future__ import annotations

import json
import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from wexio_model_language import render, validate  # noqa: E402

CASES_DIR = pathlib.Path(__file__).resolve().parents[2] / "conformance" / "cases"
CASES = [json.loads(p.read_text()) for p in sorted(CASES_DIR.glob("*.json"))]


def test_fixtures_present() -> None:
    assert CASES, "no conformance fixtures found"


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_conformance(case: dict) -> None:
    expect = case["expect"]

    if "output" in expect:
        options: dict = {}
        if "now" in case:
            options["now"] = case["now"]
        if "snippets" in case:
            options["snippets"] = case["snippets"]
        result = render(case["template"], case.get("data", {}), case["schema"], options)
        assert result["text"] == expect["output"]
        assert [w["code"] for w in result["warnings"]] == expect.get("warnings", [])

    if "diagnostics" in expect:
        result = validate(case["template"], case["schema"])
        codes = sorted(d["code"] for d in result["diagnostics"])
        assert codes == sorted(expect["diagnostics"])
