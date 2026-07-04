# Changelog

All notable changes to `model-language` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). A change
that breaks any golden test case is a breaking change.

## [1.0.2]

Version-sync release — all six registries publish in lockstep at `1.0.2` (the
engine is unchanged since `1.0.0`). Establishes **tag-driven releases**: a
`vX.Y.Z` tag stamps its version into every package manifest and publishes them
together, so registries never drift apart again.

## [1.0.1]

Packaging & docs only (the engine is unchanged). npm-only release (the other
registries stayed on `1.0.0` — reconciled in `1.0.2`).

- **Leaner npm package** — source maps are no longer published (install size
  drops ~3×; zero impact on the ~7.4 KB min+gzip bundle).
- **README** rewritten JS-first with registry badges, per-package links, and a
  cleaner description; sharpened npm keywords.

## [1.0.0]

First stable release. The language is feature-complete, the public API is final,
and the engine holds a 100% test-coverage gate. Ships for JavaScript (npm) and
Python (PyPI, via a WebAssembly module).

### Added

- **`ML211` unreachable-branch + `ML212` contradiction** — the flow-analysis lint
  rules. A conservative constraint pass derives facts (`field == "x"`, truthy,
  falsy) from conjunctive conditions: a self-contradictory condition raises
  `ML212`; a branch an enclosing condition or an earlier chain entry already
  rules out raises `ML211`. `or`/complex conditions yield no facts, so there are
  no false positives. **Editor lint set now fully implemented.** Conformance
  fixtures `lint-unreachable-branch` + `lint-contradiction` added.

- **Language hosts.** Seven CI-verified hosts run the shared conformance suite —
  Python, Go, Rust, Ruby, C#, C++, Elixir — all over the same WASM module and
  JSON contract (a Java/Chicory host is written, pending SIMD support). See
  [`hosts/`](./hosts).

- **WASM bridge + Python bindings.** The canonical TS engine is compiled to a
  self-contained WASI module (esbuild + Javy) exposing `render`/`validate`/`parse`
  over a stable JSON contract; the `model-language` PyPI package hosts it via
  `wasmtime`. A CI job builds the module and runs the conformance suite through
  the Python bindings, proving byte-for-byte parity with the TS engine.

- **Conformance fail/edge fixtures.** 10 cases covering empty templates, missing
  fields, object interpolation, unknown-filter pass-through, division-by-zero and
  non-number arithmetic (degrade to empty + `ML301`, never `NaN`), include
  cycles (`ML002`), unicode/emoji, unclosed blocks (`ML001`), and multi-diagnostic
  templates — so every host is checked on failure paths too.

- **`ML210` missing-default + `ML213` prompt-too-long** — the two static budget
  lint rules. `ML210` warns when a `nullable` field is interpolated without a
  `| default` filter. `validate` now computes a worst-case `maxTokenEstimate`
  (text exact; interpolation/include nominal, loops maxed, `if` = largest branch)
  and raises `ML213` when it exceeds `opts.maxTokenEstimate`. `ML211`/`ML212`
  (unreachable/contradiction) remain reserved — they need branch-domain flow
  analysis. Conformance fixture `lint-missing-default` added. **Editor lint set
  complete.**

- **`calculate(expr, decimals?)`** — the first built-in function (a `CallExpr` in
  the grammar): evaluates an expression and rounds it. Parser, evaluator,
  serializer, and typecheck (recurses into call args) support function calls.

- **Benchmark harness** (`pnpm bench`, `bench/engine.bench.ts`) — measures the
  cold path (parse, validate) and the hot path (render on a pre-parsed AST) for
  small and large templates.

- **0.3c — includes.** `{{include "name"}}` renders a host-supplied snippet
  (`render(ast, data, schema, { snippets })`) against the same data, with cycle
  detection and a depth limit of 5 (`ML002` on either). **0.3 complete.**

- **0.3b — directives.** `{{#priority level}}` / `{{#mode name}}` (wrap a body)
  and self-closing `{{#block actions: [...]}}`. Bodies render normally; every
  directive that fires is collected into the new `RenderResult.directives` for
  the host to consume as a runtime constraint (routing, tool blocks).

- **0.3a — comments.** `{# … #}` (single- or multi-line) are stripped at parse
  time and never rendered.

- **0.2g — currency filter.** `currency: code` formats a number with a symbol
  (USD/EUR/GBP/JPY, else the code prefixed), thousands grouping, 2 decimals, and
  correct negative sign. **0.2 complete.**

- **0.2f — datetime filters.** `days_ago`, `days_until`, `is_past`, `is_future`
  (relative to a reference `now`), and `date: fmt` (UTC, tokens `YYYY`/`MMM`/`MM`/
  `DD`/`D`/`M`). `render` gained an optional `{ now }` option (defaults to the wall
  clock; deterministic when pinned). Filters may now receive a `FilterContext`.
  Conformance fixture T12 added.

- **0.2e — array aggregation filters.** `where: "field", op, value`,
  `sort: "field", "asc"|"desc"`, `sum`, `max`, `min` (each with an optional
  field, operating on object items or primitives). Chainable and usable as a loop
  source: `{{for i in items | where: … | sort: … | limit: 3}}`.

- **0.2d — arithmetic.** `+ - * /`, parentheses, unary minus, with `* /`
  binding tighter than `+ -`, in conditions and interpolation
  (`{{if user.score >= user.range + 1}}`, `{{ 14 - x }}`). Strictly numbers-only:
  a non-number operand or a non-finite result (÷0, overflow) yields `undefined`
  (empty output), never `NaN`. Interpolation values + filter args now parse as
  full expressions. Conformance fixture T11 added.

- **0.2c — multi-select operators.** `contains_any [..]`, `contains_all [..]`, and
  the unary `is_empty` for `multiEnum` fields, in the parser, evaluator, and
  serializer. Conformance fixtures W2/W3 added.

- **0.2b — array filters + loop-source pipelines.** `count`, `join: sep`,
  `first`, `last`, `limit: n`, `pluck: "field"`. Filter pipelines now apply to a
  `for` source too — `{{for item in order.items | limit: 3}}`. `ForNode` gained an
  optional `pipeline`.

- **0.2b — string & number filters.** `upper`, `lower`, `trim`, `capitalize`,
  `truncate: n`, `replace: from, to`; `round: n=0` (half away from zero),
  `floor`, `ceil`, `abs`, `percent`. Each is total — the wrong input type passes
  through unchanged, never throws. (Array + datetime filters next.)

- **0.2a — for loops.** `{{for item in <array>}} … {{else}} … {{/for}}` render:
  block folding generalized to `if` + `for`, per-iteration scope with `item` and
  loop locals (`loop.index/first/last/count`), empty-state `else`, and non-array
  sources treated as empty. Whitespace hygiene now preserves inline spaces inside
  loop bodies. Conformance fixtures T10/T18 added.

- **0.1c — editor lint rules.** `validate()` now typechecks against the schema
  and returns diagnostics: `ML101` unknown-field (with nearest-path suggestion),
  `ML102` unknown-filter, `ML201` type-mismatch, `ML202` unknown-enum-value,
  `ML214` raw-date-comparison, `ML220` `==`-on-multi-select (with a `contains`
  quickfix). Conformance fixtures gained an `expect.diagnostics` form so ports
  verify lint behavior too.

- **0.1b — conditionals.** `{{if …}}{{elseif …}}{{else}}{{/if}}` render for real:
  a recursive-descent condition parser (comparison + logical operators, `exists`,
  `in`, `contains`, `startsWith`/`endsWith`/`matches`, precedence, parentheses),
  block folding with `ML001` recovery, an expression evaluator (operator × type
  matrix — mismatches → `false`, never throws), truthiness, `resolvedBranches`
  tracking, and whitespace hygiene (block-only lines leave no residue).
  Conformance fixtures added for T2/T5/T8/T14/T16.

- **0.1a — interpolation rendering.** `{{ path | default: "…" }}` now renders for
  real: tag classification (interpolation vs deferred block), interpolation
  expression + filter-pipeline parsing, canonical serialization (round-trip),
  safe-navigation path resolution, typed→string conversion, the `default` filter,
  and the `ML301` empty-interpolation warning.
- **Conformance suite** (`conformance/cases/*.json`) — language-neutral golden
  fixtures + a data-driven runner, so other-language ports validate against the
  same contract.
- **Example runner** — `pnpm example` / `pnpm example:run <file>` print
  `input → engine → output`; `welcome.mlt` is golden-tested.
- **Performance** + **Portability** docs (parse-once/render-many; ports via the
  conformance suite / a render service / WASM).

### Earlier (scaffold)

- Project scaffold: TypeScript, Biome (lint/format), vitest, tsup build
  (ESM + CJS + `.d.ts`), CI, MIT license.
- Stable public type contract (`parse` / `serialize` / `validate` / `render` /
  `registerFilter` / `registerRule`) — see `src/types.ts`.
- Placeholder implementations that pass plain prose through unchanged (the real
  language lands across milestones 0.1 → 0.3).
- Engine skeleton with one folder per pipeline phase: `parser/` (lexer → parser →
  serializer), `typecheck/`, `render/`, `filters/`, `rules/`, `diagnostics/`, and
  the `engine.ts` composition root — each with a minimal, fully-tested
  implementation and `TODO(0.1)` markers.
- 100% coverage gate (`pnpm test:cov`, enforced in CI) across lines, branches,
  functions, and statements.
- `docs/` language reference (getting-started, api, types, variables,
  conditionals, loops, math & functions, filters, directives, diagnostics) and
  `examples/` runnable templates.
