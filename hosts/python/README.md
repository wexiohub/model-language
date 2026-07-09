# model-language (Python)

Python bindings for [`model-language`](https://github.com/wexiohub/model-language) —
a typed, safe template language for AI-agent prompts.

Powered by the production model-language engine compiled to a WebAssembly module:
templates render **byte-for-byte identically** in Python and JavaScript, a
guarantee enforced by a shared [`conformance/`](../../conformance) suite run in CI.
Fast (parse once, render many), sandboxed, and it never crashes — template
problems degrade to empty output plus a warning.

**▶ [Live demo](https://ml.wexio.io)** — try the language in a Tiptap editor
(live validation, autocomplete, real-time render), powered by the same engine.

Filters format values — dates, numbers, text:

```text
{{ user.created_at | date: "MMM D, YYYY" }}            →  Jul 5, 2026
{{ user.created_at | date: "h:mm A", "Europe/Kyiv" }}  →  5:37 PM
{{ user.last_seen  | time_ago }}                       →  3 days ago
```

Directives embed machine-readable constraints in a prompt. They are stripped from
the rendered text and returned in `directives`:

```python
from model_language import render, validate, parse

src = (
    "Help with billing.\n"
    "{{verify_before: payments}}\n"
    "{{identity: contact.email == payment.email}}\n"
    'Greet {{contact.first_name | default: "there"}}.'
)

directives = [
    {"name": "verify_before", "hasBody": False, "arg": {"kind": "scalar", "type": "enum", "values": ["payments", "calendar"]}},
    {"name": "identity",      "hasBody": False, "arg": {"kind": "comparison", "type": "field", "comparison": {"operators": ["=="], "operandType": "field"}}},
]
schema = [{"path": "contact.email", "type": "string"}, {"path": "contact.first_name", "type": "string"}]

out = render(
    src,
    data={"contact": {"first_name": "Vasyl"}},
    schema=schema,
)
print(out["text"])        # -> "Help with billing.\n\nGreet Vasyl."
print([d["name"] for d in out["directives"]])  # -> ["verify_before", "identity"]
```

## Usage

```python
from model_language import render, validate, parse

out = render(
    "Hi {{ user.name | default: 'there' }}!",
    data={"user": {"name": "Vasyl"}},
)
print(out["text"])          # -> "Hi Vasyl!"

diags = validate(
    "{{if user.plan == 'premium'}}x{{/if}}",
    schema=[{"path": "user.plan", "type": "enum", "values": ["free", "pro"]}],
)
print([d["code"] for d in diags["diagnostics"]])   # -> ["ML202"]
```

- `render(template, data=None, schema=None, options=None)` →
  `{"text", "warnings", "resolvedBranches", "directives", "tokenEstimate"}`.
  Pass `options={"now": <epoch_ms>}` for datetime filters (the sandbox has no
  ambient clock; it defaults to `0`). Pass `options={"snippets": {...}}` for
  `{{include}}`.
- `validate(template, schema=None, options=None)` →
  `{"diagnostics", "maxTokenEstimate"}`. Pass `options={"maxTokenEstimate": N}`
  to raise `ML213` over a token budget.
- `parse(template)` → `{"ast", "diagnostics"}`.

Nothing raises for template problems — they degrade to empty output plus a
`warnings`/`diagnostics` entry.

## Build (from source)

The bindings host `model_language.wasm`, built from the TypeScript engine:

```sh
# 1. Build the WASI module (from the repo root, needs Node + pnpm + the javy CLI)
pnpm install && pnpm wasm:build

# 2. Run the conformance parity tests
pip install wasmtime pytest
cd hosts/python && python -m pytest -q
```

The loader finds the module at `../wasm/dist/model_language.wasm` by default;
set `MODEL_LANGUAGE_WASM` to point at a prebuilt one. Requires `wasmtime>=25`.
