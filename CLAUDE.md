# CLAUDE.md — working in `model-language`

Instructions for any AI agent (or human) editing this repo. Read before changing code.

## What this is

A **typed, safe, compile-time-resolved template language for AI-agent prompts** —
a standalone npm package. Non-technical users write templates with variables,
conditions, and loops; the engine parses → typechecks → renders them into clean
prompts against live data.

The canonical **language reference** (types, operators, filters, blocks,
diagnostics) lives in this package under [`docs/`](./docs/); the public API is in
[`docs/api.md`](./docs/api.md); runnable examples in [`examples/`](./examples/).
The package is self-contained — do not reference any consuming app's repo here.

## Prime directive (never violate)

**`render()` must NEVER throw and NEVER leak template syntax into its output.**
Every runtime problem degrades gracefully (empty string / false branch) and is
collected as a warning in the result — never an exception. A broken template must
still produce the best possible prompt; a silent/crashing agent is worse than a
missing sentence.

## Hard boundaries

- **Zero runtime dependencies.** The package must stay portable and safe on
  untrusted input. Dev-only deps (Biome, vitest, tsup, typescript) are fine.
- **Host-agnostic.** NEVER import framework-, app-, or product-specific types
  (no Nest, Mongo, GraphQL, Wexio field names). The host supplies a `FieldSchema`
  and a typed `DataSnapshot`; this package knows nothing else. `multiEnum` is
  "array-of-enum", not a Wexio concept.
- **The public API in `src/types.ts` + `src/index.ts` is a contract.** Changing a
  signature is a breaking (major) change. Add, don't mutate.

## Performance (hot-path module)

A prompt is rendered on every inbound message — treat `render()` as hot. **Parse
once, render many:** `parse`/`validate` are cold and cacheable; `render` must stay
pure, synchronous, allocation-light, and must never re-parse the source (it walks
the AST). Async data is resolved in a bounded pre-pass, never inside render.
Optimize with a benchmark (lands 0.2), not by guessing. Full notes:
[`docs/performance.md`](./docs/performance.md).

## Architecture / where things go

```
src/
  index.ts       Public barrel (API + types). Thin.
  engine.ts      Composition root — wires parse → typecheck into validate().
  types.ts       Public type contract — schema, AST, diagnostics, results. Stable API.
  diagnostics/   ML### code catalog (codes.ts) + Diagnostic factory (factory.ts).
  parser/        lexer.ts → parser.ts → serializer.ts  (source ↔ AST). "Parse variables" lives here.
  typecheck/     typecheck.ts — AST × schema → diagnostics (editor path).
  render/        render.ts — AST × data → final string (runtime path, never throws). "Smart output" here.
  filters/       registry.ts — filter registry (+ registerFilter).
  rules/         registry.ts — lint-rule registry (+ registerRule).
  (0.2+)         resolve/  ← async function/provider pre-resolve phase, sits beside render/
test/
  *.test.ts      Golden suite (the contract) + per-module unit + fuzz + round-trip
```

Each pipeline phase is its own folder with an `index.ts` barrel. Add new
filters under `filters/`, new lint rules under `rules/`, new AST/operator
support across `parser/` + `typecheck/` + `render/` together.

## Tooling & commands

Package manager is **pnpm** (`packageManager` field pins the version — do not add a
`version:` to the CI pnpm action, they conflict). First time in the repo, run
`pnpm install`.

```bash
pnpm test          # vitest — run the full suite (golden + unit + fuzz + round-trip)
pnpm test:watch    # vitest watch
pnpm test:cov      # coverage
pnpm lint          # Biome check (lint + format + import order) — CI FAILS on any issue
pnpm lint:fix      # Biome autofix
pnpm typecheck     # tsc --noEmit (strict, noUncheckedIndexedAccess, exactOptional off — see tsconfig)
pnpm build         # tsup → dist (ESM + CJS + .d.ts)
```

CI runs lint → typecheck → test → build on every push/PR; keep it green. Update
`pnpm-lock.yaml` when deps change (`pnpm install --lockfile-only` is enough).

## Code conventions (Biome-enforced — `pnpm lint` is the source of truth)

- Single quotes, semicolons, trailing commas, 2-space indent, width 100.
- **Imports must be sorted** (Biome `organizeImports`) — the #1 CI trip-up.
- `import type { … }` for type-only imports (`verbatimModuleSyntax` is on).
- No default exports. Explicit types on all public API.
- Extensionless relative imports (`from './types'`) — `moduleResolution: Bundler`.

## Testing discipline (this is the product)

**100% coverage is a hard gate, not a goal.** `pnpm test:cov` enforces 100%
lines / branches / functions / statements (see `vitest.config.ts`); CI runs it
and **fails on any gap**. Coverage is the floor — you also owe *case* coverage:
exercise every small and every complex path, not just every line.

1. **TDD.** Write the failing test first, then implement.
2. **Golden suite is the contract.** The acceptance cases (T1–T18 etc. from the
   language spec) are executable. **Breaking one is a breaking semver change** —
   bump accordingly and note it in `CHANGELOG.md`.
3. **Exhaustive case matrix** — every change is tested across:
   - every **operator × type** cell it touches (valid → result; invalid → edit-time
     lint error AND runtime `false`, never a throw);
   - every **filter** including the **wrong-input-type** case (pass-through + ML203);
   - every **lint code** — assert `code` + `severity` + `range` + each `quickfix`;
   - the **empty/edge inputs**: `null` vs `undefined` vs empty-string vs empty-array,
     deep null access (safe navigation), whitespace-only lines, deeply nested and
     adjacent blocks, unclosed/malformed input (parser recovery);
   - at least one **complex end-to-end** template (nested `if`/`for`/filters) with a
     realistic snapshot, asserting exact rendered output + `resolvedBranches`.
4. **Examples-as-tests.** Every code example added to `README.md` must also be a
   passing test — docs never drift from behavior.
5. **Fuzz the prime directive.** Any change to `parse`/`render` keeps the fuzz
   guarantee: thousands of random + malformed inputs — never throws, always recovers.
6. **Round-trip invariant:** `parse(serialize(ast)) ≡ ast`.

## Language surface (feature-complete)

The language is complete and published as v1.0.0: variables + filter pipelines,
`if/elseif/else` with the full operator set, `for` + loop locals, arithmetic +
`calculate()`, the complete filter set (text/number/array/datetime/currency),
`include` (+cycle detection), directives (`#priority`/`#mode`/`#block`), comments,
and the editor lint set (ML001/101/102/201/202/210/213/214/220; ML211/212
flow-analysis reserved). New work is integrations and tooling, not new syntax.

## Repository map

- `src/` — the canonical TypeScript engine (published to npm).
- `wasm/` — the engine compiled to a WASI module (esbuild + Javy).
- `hosts/` — language hosts over the WASI module: `python/` (PyPI), `go/`, + a guide for any WASI language.
- `conformance/cases/*.json` — the golden suite every host runs (the cross-host contract).

## Commits / releases

- Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `style:`).
- Keep `CHANGELOG.md` current; semver strictly (golden-break ⇒ major/minor by impact).
- Never publish with a red CI or a failing golden case.
