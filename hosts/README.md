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
| **Python** | [`wasmtime`](https://pypi.org/project/wasmtime/) (PyPI) | ✅ CI-verified — [`../python`](../python) |
| **Go** | [`wasmtime-go`](https://github.com/bytecodealliance/wasmtime-go) | ✅ CI-verified — [`./go`](./go) |
| **Rust** | [`wasmtime`](https://crates.io/crates/wasmtime) crate | reference snippet below |
| **Ruby** | [`wasmtime`](https://rubygems.org/gems/wasmtime) gem | reference snippet below |
| **Java** | [`wasmtime-java`](https://github.com/kawamuray/wasmtime-java) / [Chicory](https://github.com/dylibso/chicory) | pattern above |
| **Elixir** | [`wasmex`](https://hex.pm/packages/wasmex) | pattern above |
| **C#** | [`Wasmtime`](https://www.nuget.org/packages/Wasmtime) (NuGet) | pattern above |
| **C++** | [Wasmtime C API](https://docs.wasmtime.dev/c-api/) | pattern above |

Go and Python are built and run against the full conformance suite on every CI
run. The snippets below follow the same universal pattern; open an issue (or a PR)
to promote any of them to a CI-verified host.

### Rust

```rust
use wasmtime::*;
use wasmtime_wasi::{WasiCtxBuilder, pipe::{MemoryInputPipe, MemoryOutputPipe}};

// Load once; instantiate per call with stdin=request, stdout=buffer, run `_start`.
fn invoke(engine: &Engine, module: &Module, request: &str) -> anyhow::Result<String> {
    let stdout = MemoryOutputPipe::new(1 << 20);
    let wasi = WasiCtxBuilder::new()
        .stdin(MemoryInputPipe::new(request.as_bytes().to_vec()))
        .stdout(stdout.clone())
        .build_p1();
    let mut store = Store::new(engine, wasi);
    let mut linker = Linker::new(engine);
    wasmtime_wasi::preview1::add_to_linker_sync(&mut linker, |c| c)?;
    let instance = linker.instantiate(&mut store, module)?;
    let start = instance.get_typed_func::<(), ()>(&mut store, "_start")?;
    let _ = start.call(&mut store, ()); // a clean WASI exit is fine
    Ok(String::from_utf8(stdout.contents().to_vec())?)
}
```

### Ruby

```ruby
require "wasmtime"
require "json"
require "tempfile"

engine = Wasmtime::Engine.new
mod = Wasmtime::Module.from_file(engine, "wasm/dist/model_language.wasm")

def invoke(engine, mod, request)
  Dir.mktmpdir do |dir|
    File.write("#{dir}/in", JSON.dump(request))
    wasi = Wasmtime::WasiCtxBuilder.new.set_stdin_file("#{dir}/in").set_stdout_file("#{dir}/out").build
    store = Wasmtime::Store.new(engine, wasi_ctx: wasi)
    linker = Wasmtime::Linker.new(engine, wasi: true)
    linker.instantiate(store, mod).invoke("_start") rescue nil # clean WASI exit is fine
    JSON.parse(File.read("#{dir}/out"))
  end
end

invoke(engine, mod, { op: "render", template: "Hi {{n}}", data: { n: "x" } })
```

For Java, Elixir, C#, and C++, apply the universal pattern with that runtime's
WASI stdin/stdout API (linked above).
