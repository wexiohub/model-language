# Portability — using ML from other languages

The canonical implementation is this npm package, for JavaScript/TypeScript
runtimes (Node, Deno, Bun, browsers). Model Language is deliberately defined
**independently of any implementation**, so it can live in other ecosystems too.

## The language is a spec + a conformance suite, not just this code

What *defines* Model Language is:

1. the language reference in [`docs/`](./README.md), and
2. a **language-neutral conformance suite** — golden cases as plain JSON:

```json
{
  "name": "T4 safe-navigation + default",
  "template": "CSM: {{user.csm.name | default: \"our team\"}}",
  "schema": [{ "path": "user.csm", "type": "object", "nullable": true }],
  "data": { "user": { "csm": null } },
  "expect": { "output": "CSM: our team", "warnings": [] }
}
```

Any implementation — JavaScript, Python, Go, Java, Ruby, Elixir, Rust, PHP, C#,
… — that passes the same JSON fixtures renders identically **by construction**. This package's golden tests load
these fixtures; a port loads the very same files. (This is how CommonMark, JSONPath
and similar language specs stay consistent across implementations.)

The fixtures live in `conformance/` (added incrementally alongside the engine) so
they are consumable from any language, not locked inside TypeScript test files.

## Path 1 — a native port (recommended for heavy use)

Reimplement the engine in the target language and validate it against
`conformance/`. You get native speed and zero cross-runtime glue. The suite is the
contract; if it passes, behavior matches.

## Path 2 — no port (reuse this engine)

`validate` and `render` are pure functions, which makes reuse easy:

- **As a service.** Wrap the Node engine in a tiny stateless HTTP/gRPC endpoint
  (`POST /render {ast|source, data} → {text, warnings}`) and call it from Python,
  Ruby, PHP, anywhere. Cache parsed ASTs; the service holds no per-request state.
- **As WASM (future).** A WebAssembly build callable from host languages without a
  Node process, for teams that want in-process embedding.

## Recommendation

For a polyglot org: keep **one canonical language** (this spec + `conformance/`),
use this npm package directly in JS/TS services, and either stand up the render
service for other languages now, or invest in a native port when volume justifies
it. Never fork the *semantics* — only the implementation. The conformance suite is
what keeps every copy honest.
