# Changelog

All notable changes to `@wexio/model-language` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). A change
that breaks any golden test case is a breaking change.

## [Unreleased]

### Added

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
