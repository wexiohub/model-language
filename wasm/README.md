# WASM bridge

The canonical engine is TypeScript. Rather than reimplement the language in
every host language, we compile the **one** engine to a **WebAssembly
component** and let any host call it over a stable JSON contract. Python, Go,
Ruby, Rust, and Java all run byte-for-byte identical output — verified against
the same [`conformance/`](../conformance) fixtures as the TS engine.

```
src/ (TS engine)  ─esbuild→  dist/engine.js  ─componentize-js→  dist/model_language.wasm
                                                                        │
                          any WASM-component host (Python, Go, Ruby, Rust, Java …)
```

## The contract

Three exports, each a JSON **string → string** function (see
[`wit/world.wit`](./wit/world.wit)):

| Export | Request | Response |
|---|---|---|
| `render` | `{ template, data?, schema?, options? }` | `{ text, warnings, resolvedBranches, directives, tokenEstimate }` |
| `validate` | `{ template, schema?, options? }` | `{ diagnostics, maxTokenEstimate }` |
| `parse` | `{ template }` | `{ ast, diagnostics }` |

The shapes are identical to the conformance fixtures. Functions never trap — a
bad request returns `{ "error": string }`.

## Build

```sh
pnpm wasm:build   # esbuild bundle -> componentize-js -> wasm/dist/model_language.wasm
```

The component disables all ambient capabilities (`clocks`, `random`, `stdio`,
`http`) — the engine is pure, so the `.wasm` has **no WASI imports** and any host
instantiates it with zero wiring. Because there is no clock, `render` pins `now`
to `0` unless the host passes `options.now` (epoch ms) for datetime filters.

## Hosts

- **Python** — see [`../python`](../python). Ships today, CI-verified against the
  conformance suite.
- **Others** — the `.wasm` is language-neutral. Generate host bindings with your
  runtime's component tooling (e.g. `wasmtime` for Rust/Go, `wasmtime-py` for
  Python) and call `render`/`validate`/`parse` with JSON strings.

## Why a component (not a service)

In-process, no network hop, no server to run. The JSON contract is the
future-proof seam: the internals (today componentize-js over the TS engine) can
later be swapped for a native core without any host seeing a change.
