# model-language (Python)

Python bindings for [`model-language`](https://github.com/wexiohub/model-language).
The engine is **not** reimplemented — this package runs the exact same
TypeScript engine, compiled to a WebAssembly component, so templates render
byte-for-byte identically to JavaScript. Verified against the shared
[`conformance/`](../conformance) fixtures in CI.

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
cd python && python -m pytest -q
```

The loader finds the module at `../wasm/dist/model_language.wasm` by default;
set `MODEL_LANGUAGE_WASM` to point at a prebuilt one. Requires `wasmtime>=25`.
