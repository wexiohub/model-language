# Hosting model-language in any language

model-language ships as one engine — the TypeScript build compiled to a
self-contained **WebAssembly (WASI) module**, [`wasm/dist/model_language.wasm`](../wasm).
Any language with a WASI runtime can run it and get **byte-for-byte identical**
output, verified against the shared [`conformance/`](../conformance) suite.

There is nothing to reimplement: a host is ~30 lines that pipe JSON through the
module.

## The contract

Write **one JSON request** to the module's stdin; read **one JSON response** from
its stdout. The request's `op` selects the operation:

| `op` | Request | Response |
|---|---|---|
| `render` | `{ "op": "render", "template", "data"?, "schema"?, "options"? }` | `{ "text", "warnings", "resolvedBranches", "directives", "tokenEstimate" }` |
| `validate` | `{ "op": "validate", "template", "schema"?, "options"? }` | `{ "diagnostics", "maxTokenEstimate" }` |
| `parse` | `{ "op": "parse", "template" }` | `{ "ast", "diagnostics" }` |

The module is a standard WASI command with **no custom imports** and no ambient
capabilities (clocks/randomness/stdio/network disabled), so any runtime hosts it
with zero wiring. It never traps — a bad request returns `{ "error": string }`.
`render` pins `now` to `0` unless you pass `options.now` (epoch ms) for datetime
filters.

## The universal pattern

1. Load the module once (compile/cache it).
2. Per call: create a fresh store/instance, wire stdin ⟵ request bytes and
   stdout ⟶ a buffer, run the `_start` export, read the buffer, parse JSON.

Loading is cold and cacheable; the per-call cost is the instantiation + run.

## Reference hosts

| Language | Runtime binding | Status |
|---|---|---|
| **Python** | [`wasmtime`](https://pypi.org/project/wasmtime/) (PyPI) | ✅ CI-verified — [`./python`](./python) |
| **Go** | [`wasmtime-go`](https://github.com/bytecodealliance/wasmtime-go) | ✅ CI-verified — [`./go`](./go) |
| **Rust** | [`wasmtime`](https://crates.io/crates/wasmtime) crate | ✅ CI-verified — [`./rust`](./rust) |
| **Ruby** | [`wasmtime`](https://rubygems.org/gems/wasmtime) gem | ✅ CI-verified — [`./ruby`](./ruby) |
| **Elixir** | [`wasmex`](https://hex.pm/packages/wasmex) | ✅ CI-verified — [`./elixir`](./elixir) |
| **C#** | [`Wasmtime`](https://www.nuget.org/packages/Wasmtime) (NuGet) | ✅ CI-verified — [`./csharp`](./csharp) |
| **C++** | [Wasmtime C API](https://docs.wasmtime.dev/c-api/) | ✅ CI-verified — [`./cpp`](./cpp) |

**Seven hosts — Python, Go, Rust, Ruby, C#, C++, and Elixir — are each built and
run against the full conformance suite on every CI run.** See their folders above
for the host + parity test. For any other WASI language, apply the universal
pattern above.

> **Java:** pure-JVM runtimes can't host the module yet — Chicory lacks SIMD (the
> Javy module uses `v128`), and GraalWasm runs it but its WASI stdin/stdout wiring
> to in-memory streams is unresolved. Use a native wasmtime JVM binding with the
> universal pattern.
