# Performance

Model Language is built to be a **performance-critical** module: a prompt may be
rendered on every inbound message, for every contact, across many orgs. The
architecture is shaped around that.

## The core principle: parse once, render many

Authoring is rare; rendering is hot. The API separates them so the expensive work
happens once and the per-message work stays cheap:

| Phase | Frequency | Cost | Cache |
|---|---|---|---|
| `parse(source)` → AST | once per template edit | lexing + parsing | **cache the AST** on the template row |
| `validate(source, schema)` | per keystroke (editor) | typecheck | cache by `hash(source)+schemaVersion` |
| `render(ast, data, schema)` | **per message** | AST walk + data lookups | — (data changes every call) |

**Do not re-parse on the hot path.** Store the parsed AST (or serialize it) and
call `render` with it. `render` never touches the source string.

## Hot-path rules (the renderer)

- **Pure & synchronous.** No I/O, no `await`, no allocation of parsers. Async data
  (providers, `fetch`-style functions) is resolved in a **bounded pre-pass** and
  handed to `render` as a plain snapshot — see [functions](./functions.md).
- **Allocation-light.** Build output without intermediate garbage; resolve paths
  and run filters without re-parsing expressions (they're already AST).
- **Never throws.** Error handling is branch selection + a warnings array, not
  exceptions (throwing/catching on the hot path is expensive and unsafe).
- **Lazy data.** Only the namespaces a template actually references are resolved
  (static analysis of the AST) — a template that never mentions `subscription.*`
  triggers no billing lookup.

## Cold-path rules (parser / typechecker)

Correctness and clarity first; these run rarely and are cacheable. Still bounded
against untrusted input: template ≤ 64KB, AST nodes ≤ 5k, include depth ≤ 5,
`matches` regex compiled with a timeout.

## Footprint

- **Zero runtime dependencies** → fast cold start, small install, no transitive
  risk.
- Ships ESM + CJS + types; tree-shakeable (`sideEffects: false`).

## Measuring

Optimize with numbers, not vibes. A benchmark harness ships in
[`bench/engine.bench.ts`](../bench/engine.bench.ts) — run `pnpm bench`. It
measures the **cold** path (parse, validate) and the **hot** path (render against
a pre-parsed AST), for small and large templates, so every optimization is
justified by a measured delta. The parse-once/render-many split is the
load-bearing win it demonstrates.
