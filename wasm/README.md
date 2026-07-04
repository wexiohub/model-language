# WASM bridge

The canonical engine is TypeScript. Rather than reimplement the language in
every host language, we compile the **one** engine to a self-contained
**WebAssembly (WASI) module** and let any host call it over a stable JSON
contract. Python, Go, Rust, Ruby, C#, C++, and Elixir all get byte-for-byte
identical output — verified against the same [`conformance/`](../conformance)
fixtures as the TS engine.

```
src/ (TS engine)  ─esbuild→  dist/engine.js  ─javy build→  dist/model_language.wasm
                                                                   │
                    any WASM/WASI host (Python, Go, Rust, Ruby, C#, C++, Elixir …)
```

## The contract

The module reads **one JSON request** from stdin and writes **one JSON response**
to stdout. The request's `op` selects the operation:

| `op` | Request | Response |
|---|---|---|
| `render` | `{ op, template, data?, schema?, options? }` | `{ text, warnings, resolvedBranches, directives, tokenEstimate }` |
| `validate` | `{ op, template, schema?, options? }` | `{ diagnostics, maxTokenEstimate }` |
| `parse` | `{ op, template }` | `{ ast, diagnostics }` |

The response shapes are identical to the conformance fixtures. The module never
traps — a bad request returns `{ "error": string }`.

## Build

```sh
pnpm wasm:build   # esbuild bundle -> javy build -> wasm/dist/model_language.wasm
```

Needs the [`javy`](https://github.com/bytecodealliance/javy) CLI on `PATH` (the
CI workflow downloads the release binary). The module is a standard WASI command:
it has no custom imports, so any WASI-capable runtime can host it with zero
wiring. It has no ambient clock, so `render` pins `now` to `0` unless the host
passes `options.now` (epoch ms) for datetime filters.

## Hosts

Five hosts are built and run against the full conformance suite on every CI run:
**Python, Go, Rust, Ruby, and C#** — see [`../hosts`](../hosts), which also has a
guide for any other WASI language (write the JSON request to stdin, read the
response from stdout). The `.wasm` is language-neutral: any runtime that can run
a WASI command (`wasmtime`, `wasmer`, Node's WASI, browsers via a shim) hosts it.

## Why a module (not a service)

In-process, no network hop, no server to run. The JSON contract is the
future-proof seam: today it's Javy over the TS engine; it can later be swapped
for a WebAssembly Component or a native core without any host seeing a change.

> **On the transport.** We first targeted the WebAssembly Component Model
> (`componentize-js`), but `wasmtime-py` removed its component `bindgen` in late
> 2025 with no pure-Python replacement yet, so hosting a component from Python is
> currently impractical. Javy produces a plain WASI module that today's
> `wasmtime-py` hosts with its stable API. The JSON contract is unchanged, so we
> can move back to the Component Model when its Python host story matures.
