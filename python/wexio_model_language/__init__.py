"""Python bindings for ``@wexio/model-language``.

The engine is not reimplemented here — this package runs the *exact same*
TypeScript engine, compiled to a WebAssembly component, through a stable JSON
contract (identical to the ``conformance/`` fixtures). So a template renders
byte-for-byte the same in Python as it does in JavaScript.

    from wexio_model_language import render, validate, parse

    out = render(
        "Hi {{ user.name | default: 'there' }}!",
        data={"user": {"name": "Vasyl"}},
    )
    print(out["text"])  # -> "Hi Vasyl!"

The ``_bindings`` package is generated from ``model_language.wasm`` with
``python -m wasmtime.bindgen`` (see the repo's ``python/`` README / CI). It is a
build artifact and is not committed.
"""

from __future__ import annotations

import json
from typing import Any

from wasmtime import Store

from ._bindings import Root

__all__ = ["render", "validate", "parse"]

# One long-lived component instance (a persistent JS realm). Reused across calls
# — this is the "parse cold, render hot" property carried across the boundary.
_store = Store()
_root = Root(_store)


def render(
    template: str,
    data: dict[str, Any] | None = None,
    schema: list[dict[str, Any]] | None = None,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Render ``template`` against ``data``.

    Returns ``{"text", "warnings", "resolvedBranches", "directives",
    "tokenEstimate"}``. Never raises for template problems — they degrade to
    empty output plus a ``warnings`` entry. Pass ``options={"now": <epoch_ms>}``
    for datetime filters (the sandbox has no ambient clock; it defaults to 0).
    """
    request = json.dumps(
        {
            "template": template,
            "data": data or {},
            "schema": schema or [],
            "options": options or {},
        }
    )
    return json.loads(_root.render(_store, request))


def validate(
    template: str,
    schema: list[dict[str, Any]] | None = None,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Validate ``template`` against ``schema`` for the editor.

    Returns ``{"diagnostics", "maxTokenEstimate"}``. Pass
    ``options={"maxTokenEstimate": N}`` to raise ``ML213`` over a token budget.
    """
    request = json.dumps(
        {"template": template, "schema": schema or [], "options": options or {}}
    )
    return json.loads(_root.validate(_store, request))


def parse(template: str) -> dict[str, Any]:
    """Parse ``template`` to its AST. Returns ``{"ast", "diagnostics"}``."""
    return json.loads(_root.parse(_store, json.dumps({"template": template})))
