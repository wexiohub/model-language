# Benchmark results

Latest `pnpm bench` run (vitest bench). Numbers are indicative — they depend on
the machine and Node version — but the **shape** is the point: rendering a
pre-parsed AST (the hot path) is much cheaper than parsing, which is why the
architecture is **parse once, render many**.

> Machine: Apple Silicon (darwin), Node 22, vitest 2.1. Re-run with `pnpm bench`.

## parse (cold path — done once per template edit, cacheable)

| template | ops/sec | mean |
|---|---|---|
| small | 348,305 | 0.0029 ms |
| large | 45,738 | 0.0219 ms |

## render (hot path — per message, against a pre-parsed AST)

| template | ops/sec | mean |
|---|---|---|
| small | 1,172,085 | 0.0009 ms |
| large | 73,833 | 0.0135 ms |

## validate (editor path — per keystroke, debounced)

| template | ops/sec | mean |
|---|---|---|
| large | 43,684 | 0.0229 ms |

## Takeaway

- **Render is the cheapest hot-path op.** A small template renders in ~0.9 µs
  (>1.1M/sec); the large multi-feature template (nested `if`, `for` with a
  `where → sort → limit` pipeline, `currency`, arithmetic) renders in ~13.5 µs
  (~74k/sec).
- **Render (hot) beats parse (cold)** — ~1.6× for the large template — so caching
  the parsed AST and calling `render(ast, data)` per message is the win. Never
  re-parse on the hot path.
- `validate` (parse + typecheck) sits with parse (~0.023 ms large): comfortably
  under a keystroke-debounce budget for live editor diagnostics.

The [`bench/engine.bench.ts`](./engine.bench.ts) harness guards these paths
against regression — run it before/after any change to the lexer, parser, or
renderer.
