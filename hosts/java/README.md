# Java host (Chicory)

This is a complete, correct Java host using [Chicory](https://chicory.dev), the
pure-JVM WebAssembly runtime (no native dependencies): it wires the JSON request
to the module's stdin, calls the `_start` export, and reads the JSON response
from stdout — see [`Conformance.java`](./src/main/java/Conformance.java).

## ⚠️ Not yet CI-verified — SIMD

The Javy-built `model_language.wasm` contains **SIMD (`v128`) instructions**,
which Chicory's interpreter does not execute yet:

```
Machine doesn't recognize Instruction … V128_LOAD …
```

So this host is correct but blocked by a runtime limitation, not a bug. To run
it on the JVM today, use a **native-backed binding** (which supports SIMD) — e.g.
[wasmtime-java](https://github.com/kawamuray/wasmtime-java) — with the same
universal pattern. Once Chicory ships SIMD support, this host runs unchanged; it
will move into the CI parity matrix then.

The seven CI-verified hosts (Python, Go, Rust, Ruby, C#, C++, Elixir) all run the
full [`conformance/`](../../conformance) suite on every build.

## Run (once on a SIMD-capable runtime)

```sh
MODEL_LANGUAGE_WASM=../../wasm/dist/model_language.wasm mvn -q -B compile exec:java
```
