# Java host

Two JVM WebAssembly runtimes were attempted for the Java host; both hit a wall on
the Javy-built module, so Java is **not yet CI-verified** (the other seven hosts —
Python, Go, Rust, Ruby, C#, C++, Elixir — are). The host code here
([`Conformance.java`](./src/main/java/Conformance.java)) is a correct, complete
reference; it lights up when either gap below closes.

## What was tried

- **[Chicory](https://chicory.dev)** (pure-JVM, zero native deps) — cannot execute
  the module's **SIMD (`v128`)** instructions (Chicory passes the WASM v1 spec
  except SIMD). Blocked at `V128_LOAD`.
- **[GraalWasm](https://www.graalvm.org/webassembly/)** (Maven artifacts, runs on
  a stock JDK 21+) — **SIMD works** and the module instantiates and runs `_start`,
  but wiring the module's WASI **stdin/stdout to in-memory streams**
  (`Context.Builder.in/out`) did not deliver the request/response in testing. The
  current file uses the GraalWasm path.

## To finish it

- Use a **native wasmtime JVM binding** (SIMD-capable, real WASI stdio) — e.g.
  [wasmtime-java](https://github.com/kawamuray/wasmtime-java) — with the universal
  stdin→stdout pattern, **or**
- resolve GraalWasm's WASI stdio wiring (feed the request on stdin, capture
  stdout), **or**
- wait for Chicory SIMD support, then the Chicory version (git history) works
  unchanged.

The `.wasm` and the JSON contract are unchanged, so any of these is a
self-contained follow-up.
