# Benchmark results

Latest `pnpm bench` run (vitest bench). Numbers are indicative — they depend on
the machine and Node version — but the **shape** is the point: rendering a
pre-parsed AST (the hot path) is much cheaper than parsing, which is why the
architecture is **parse once, render many**.

> Machine: Apple Silicon (darwin), Node 22, vitest 2.1. Re-run with `pnpm bench`.

Three templates: **small** (one interpolation + a filter), **large** (nested
`if` + a `for` with a `where→sort→limit` pipeline + `currency` + arithmetic), and
**huge** (a deliberately extreme template — two `include`s, a `#priority`
directive, a complex boolean condition, arithmetic, and a nested loop over 8
departments × 12 members each with an inner `where→sort→limit` pipeline and a
nested `if/elseif/else`).

## parse (cold path — done once per template edit, cacheable)

| template | ops/sec | mean |
|---|---|---|
| small | 343,708 | 0.0029 ms |
| large | 46,302 | 0.0216 ms |
| huge | 30,651 | 0.0326 ms |

## render (hot path — per message, against a pre-parsed AST)

| template | ops/sec | mean |
|---|---|---|
| small | 1,203,915 | 0.0008 ms |
| large | 74,378 | 0.0134 ms |
| huge | 13,120 | 0.0762 ms |

## validate (editor path — per keystroke, debounced)

| template | ops/sec | mean |
|---|---|---|
| large | 42,549 | 0.0235 ms |
| huge | 30,424 | 0.0329 ms |

## Takeaway

- **Render is the cheapest hot-path op.** A small template renders in ~0.8 µs
  (>1.2M/sec); the large template in ~13 µs (~74k/sec); even the **huge**
  template — nested loops over ~100 members with per-loop `where→sort→limit`
  pipelines, includes, and a directive — renders in ~76 µs (~13k/sec).
- **Parse once, render many.** Parsing the huge template costs ~33 µs; rendering
  its cached AST is the per-message cost. Cache the parsed AST and call
  `render(ast, data)` — never re-parse on the hot path.
- `validate` (parse + typecheck) stays with parse (~0.023–0.033 ms): comfortably
  under a keystroke-debounce budget for live editor diagnostics, even on the huge
  template.

The [`bench/engine.bench.ts`](./engine.bench.ts) harness guards these paths
against regression — run it before/after any change to the lexer, parser, or
renderer.
