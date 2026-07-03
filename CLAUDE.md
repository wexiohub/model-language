# CLAUDE.md — working in `@wexio/model-language`

Instructions for any AI agent (or human) editing this repo. Read before changing code.

## What this is

A **typed, safe, compile-time-resolved template language for AI-agent prompts** —
a standalone npm package. Non-technical users write templates with variables,
conditions, and loops; the engine parses → typechecks → renders them into clean
prompts against live data.

The canonical **language specification** (types, operators, filters, blocks, lint
codes, golden tests) lives in the consuming app's repo at
`docs/AI_MODEL_LANGUAGE.md` (Wexio `backend-app`), and the build/phasing design at
`docs/superpowers/specs/2026-07-03-model-language-design.md`. This package
implements that language.

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

## Architecture / where things go

```
src/
  types.ts     Public type contract — schema, AST, diagnostics, results. Stable API.
  index.ts     Public functions: parse · serialize · validate · render · registerFilter · registerRule
  (0.1+)       lexer.ts · parser.ts · typecheck.ts · render.ts · filters/ · rules/  ← added per milestone
test/
  *.test.ts    Golden suite (the contract) + unit + fuzz + round-trip
```

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

1. **TDD.** Write the failing test first, then implement.
2. **Golden suite is the contract.** The acceptance cases (T1–T18 etc. from the
   language spec) are executable. **Breaking one is a breaking semver change** —
   bump accordingly and note it in `CHANGELOG.md`.
3. **Examples-as-tests.** Every code example added to `README.md` must also be a
   passing test — docs never drift from behavior.
4. **Fuzz the prime directive.** Any change to `parse`/`render` keeps the fuzz
   guarantee: random + malformed input never throws, parse always recovers.
5. **Round-trip invariant:** `parse(serialize(ast)) ≡ ast`.
6. Every filter and every lint rule gets its own unit test (assert diagnostic
   `code` + `range` + `quickfix`).

## Milestone scope (don't build ahead)

- **0.1** — variables, `if/elseif/else`, operators, `and/or/not`, safe nav,
  `default` filter, whitespace hygiene, parse/serialize, core lint rules
  (ML001, ML101, ML201, ML202, ML220, ML214).
- **0.2** — `for` loops + locals, array/string/number/datetime filters, arithmetic.
- **0.3** — `include` (+cycle detection), directives (`#priority`/`#mode`/`#block`),
  comments.

Each milestone is a publishable minor. Don't pull later-milestone features forward
without updating the plan.

## Commits / releases

- Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `style:`).
- Keep `CHANGELOG.md` current; semver strictly (golden-break ⇒ major/minor by impact).
- Never publish with a red CI or a failing golden case.
