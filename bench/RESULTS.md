# Benchmark results

Latest `pnpm bench` run (vitest bench). Numbers are indicative — they depend on
the machine and Node version — but the **shape** is the point: rendering a
pre-parsed AST (the hot path) is much cheaper than parsing, which is why the
architecture is **parse once, render many**.

> Machine: Apple Silicon (darwin), Node 22, vitest 2.1. Re-run with `pnpm bench`.

Four templates, chosen to stress **two independent axes**:

- **small** — one interpolation + a filter.
- **large** — nested `if` + a `for` with a `where→sort→limit` pipeline +
  `currency` + arithmetic.
- **huge** — *runtime-heavy*: two `include`s, a `#priority` directive, a complex
  boolean condition, arithmetic, and a nested loop over 8 departments × 12
  members each with an inner `where→sort→limit` pipeline and a nested
  `if/elseif/else`. Small source, lots of work per render.
- **xl** — *source-heavy*: ~500 independent `if/elseif/else` rule blocks (each
  with `and`/`or`/`not`, arithmetic, filters, interpolation) → **3,500 lines /
  ~100 KB**. This is the "1,000–4,000-line prompt full of logical rules" case.

## parse (cold path — done once per template edit, cacheable)

| template | ops/sec | mean |
|---|---|---|
| small | 356,162 | 0.0028 ms |
| large | 46,983 | 0.0213 ms |
| huge | 31,513 | 0.0317 ms |
| xl (3.5k lines) | 146 | 6.85 ms |

## render (hot path — per message, against a pre-parsed AST)

| template | ops/sec | mean |
|---|---|---|
| small | 1,157,324 | 0.0009 ms |
| large | 74,689 | 0.0134 ms |
| huge | 13,349 | 0.0749 ms |
| xl (3.5k lines) | 944 | 1.06 ms |

## validate (editor path — per keystroke, debounced)

| template | ops/sec | mean |
|---|---|---|
| large | 44,801 | 0.0223 ms |
| huge | 31,181 | 0.0321 ms |
| xl (3.5k lines) | 133 | 7.50 ms |

## Takeaway

- **The hot path stays sub-millisecond-to-low-millisecond even at extreme
  scale.** A production-sized 3,500-line prompt with 500 logical rule blocks
  renders from its cached AST in **~1.06 ms** (~944/sec on one core). Realistic
  prompts (tens to a few hundred lines) render in **microseconds**.
- **Two axes, both linear.** `huge` (runtime-heavy nested loops over ~100
  members) renders in ~75 µs; `xl` (source-heavy, 3,500 lines) in ~1 ms. Cost
  scales **linearly** with what's actually there: parse/typecheck are `O(nodes)`,
  render is `O(nodes visited)`. Logical rules don't blow up — each condition is
  evaluated once with short-circuit `and`/`or`. The only super-linear cost is
  data-driven (a loop over N items renders its body N times), never the number of
  rules or lines.
- **Parse once, render many.** Parsing `xl` costs ~6.85 ms; that happens once on
  save and is cached. Never re-parse on the hot path — call `render(ast, data)`.
- **`validate` fits the editor budget.** Even the 3,500-line `xl` validates in
  ~7.5 ms, comfortably under a typical 150–300 ms keystroke debounce; normal
  templates validate in tens of microseconds.

The [`bench/engine.bench.ts`](./engine.bench.ts) harness guards these paths
against regression — run it before/after any change to the lexer, parser, or
renderer.
