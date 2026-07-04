"""Fuzz the prime directive across the bridge: render/validate/parse never crash.

A deterministic set of malformed, adversarial, and pathological templates — every
one must return a dict, never raise, and never trap the WASM instance.
"""

from __future__ import annotations

import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from model_language import parse, render, validate  # noqa: E402

FUZZ = [
    "",
    "{{",
    "}}",
    "{{ }}",
    "{{if}}",
    "{{/if}}",
    "{{if x}}",
    "{{for}}{{/for}}",
    "{{ user.a.b.c.d.e.f }}",
    "{{ 1 / 0 }}",
    "{{ 'x' * 'y' }}",
    "{{#priority}}",
    "{{include}}",
    "{{# unclosed comment",
    "{{ user.name | | | }}",
    "{{if a and or not b}}{{/if}}",
    "нестандарт {{юзер.имя}} 🎉",
    "{{ " + "a" * 500 + " }}",
    "{{if x}}" * 50 + "hi" + "{{/if}}" * 50,
    "{" * 100,
    "}" * 100,
    "{{for x in xs}}{{for y in x}}{{y}}{{/for}}{{/for}}",
]

IDS = [str(i) for i in range(len(FUZZ))]


@pytest.mark.parametrize("template", FUZZ, ids=IDS)
def test_render_never_crashes(template: str) -> None:
    result = render(template)
    assert isinstance(result, dict)
    assert "text" in result or "error" in result


@pytest.mark.parametrize("template", FUZZ, ids=IDS)
def test_validate_never_crashes(template: str) -> None:
    assert isinstance(validate(template), dict)


@pytest.mark.parametrize("template", FUZZ, ids=IDS)
def test_parse_never_crashes(template: str) -> None:
    assert isinstance(parse(template), dict)
