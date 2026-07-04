"""Python bindings for ``model-language`` — a typed, safe template language for
AI-agent prompts.

Powered by the production model-language engine (compiled to a self-contained
WebAssembly module), so every template renders **byte-for-byte identically** in
Python and JavaScript — a guarantee enforced by a shared conformance suite in CI.
It's fast (parse once, render many), sandboxed, and never crashes: template
problems degrade to empty output plus a warning, never an exception.

    from model_language import render, validate, parse

    out = render(
        "Hi {{ user.name | default: 'there' }}!",
        data={"user": {"name": "Vasyl"}},
    )
    print(out["text"])  # -> "Hi Vasyl!"

The module is hosted with ``wasmtime``: each call runs the WASI module with the
JSON request on stdin and reads the JSON response from stdout. Build the ``.wasm``
with ``pnpm wasm:build`` (see the repo's ``python/`` README), or point
``MODEL_LANGUAGE_WASM`` at a prebuilt module.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from wasmtime import Engine, Linker, Module, Store, Trap, WasiConfig

__all__ = ["render", "validate", "parse"]


def _wasm_path() -> Path:
    # 1) explicit override, 2) module bundled into the wheel, 3) repo dev layout.
    override = os.environ.get("MODEL_LANGUAGE_WASM")
    if override:
        return Path(override)
    bundled = Path(__file__).resolve().parent / "model_language.wasm"
    if bundled.exists():
        return bundled
    return Path(__file__).resolve().parents[2] / "wasm" / "dist" / "model_language.wasm"


_engine = Engine()
_module = Module.from_file(_engine, str(_wasm_path()))
_linker = Linker(_engine)
_linker.define_wasi()


def _invoke(request: dict[str, Any]) -> dict[str, Any]:
    """Run one request through the WASI module (stdin -> stdout) and parse it."""
    store = Store(_engine)
    with tempfile.TemporaryDirectory() as tmp:
        in_path = Path(tmp) / "in.json"
        out_path = Path(tmp) / "out.json"
        in_path.write_text(json.dumps(request))
        out_path.write_bytes(b"")

        config = WasiConfig()
        config.stdin_file = str(in_path)
        config.stdout_file = str(out_path)
        store.set_wasi(config)

        instance = _linker.instantiate(store, _module)
        start = instance.exports(store)["_start"]
        try:
            start(store)
        except Trap as trap:  # a WASI `proc_exit(0)` surfaces as a trap; 0 is success
            if getattr(trap, "code", None) != 0:
                raise

        return json.loads(out_path.read_text())


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
    for datetime filters (the sandbox has no ambient clock; it defaults to 0) and
    ``options={"snippets": {...}}`` for ``{{include}}``.
    """
    return _invoke(
        {
            "op": "render",
            "template": template,
            "data": data or {},
            "schema": schema or [],
            "options": options or {},
        }
    )


def validate(
    template: str,
    schema: list[dict[str, Any]] | None = None,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Validate ``template`` against ``schema`` for the editor.

    Returns ``{"diagnostics", "maxTokenEstimate"}``. Pass
    ``options={"maxTokenEstimate": N}`` to raise ``ML213`` over a token budget.
    """
    return _invoke(
        {"op": "validate", "template": template, "schema": schema or [], "options": options or {}}
    )


def parse(template: str) -> dict[str, Any]:
    """Parse ``template`` to its AST. Returns ``{"ast", "diagnostics"}``."""
    return _invoke({"op": "parse", "template": template})
