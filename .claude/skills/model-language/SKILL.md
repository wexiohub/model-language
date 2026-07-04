---
name: model-language
description: Use when editing the model-language engine — adding or changing a filter, lint rule, operator, AST node, or any parse/typecheck/render behavior. Encodes the architecture, the never-throw prime directive, the TDD + golden-suite workflow, and the release/semver discipline for this package.
---

# Editing `model-language`

A standalone, zero-dependency, host-agnostic template-language engine
(parse → typecheck → render) for AI-agent prompts. This skill is the playbook for
changing it safely. Read `CLAUDE.md` (repo root) first for the always-on rules;
this skill adds the step-by-step recipes.

## Non-negotiables (verify every change against these)

1. **`render()` never throws, never leaks syntax.** Runtime problems become
   warnings in the result, not exceptions. Degrade to empty string / false branch.
2. **Zero runtime dependencies. Host-agnostic.** No framework/app/product types.
   The host supplies `FieldSchema` + typed `DataSnapshot`; nothing else enters.
3. **The public API (`src/types.ts`, `src/index.ts`) is a contract.** Add, don't
   mutate signatures. A signature change is a major version.
4. **Golden suite is the contract.** Breaking a golden case is a breaking semver
   change — intended or not, treat it as a red flag until proven intentional.
5. **100% coverage is a hard CI gate** (`pnpm test:cov`, thresholds in
   `vitest.config.ts`). Coverage is the floor; also cover *cases* — see the case
   matrix in `CLAUDE.md`. Every new line AND every small/complex path is tested.

## Workflow for any change (TDD)

1. **Write the failing test first** — a golden case (from the language spec) or a
   unit test. Run `pnpm test`, confirm it fails for the right reason.
2. **Implement the minimum** to pass. Keep files focused (lexer/parser/typecheck/
   render/filters/rules are separate units).
3. **Green the gates, in this order:**
   ```bash
   pnpm test        # golden + unit + fuzz + round-trip
   pnpm typecheck   # tsc --noEmit, strict
   pnpm lint        # Biome — sorts imports too; run pnpm lint:fix if it complains
   pnpm build       # tsup — confirm it still builds ESM+CJS+dts
   ```
4. **Update docs in the same change.** If you added user-facing syntax, add a
   `README.md` example — and that example MUST also be a passing test
   (examples-as-tests). Add a `CHANGELOG.md` entry under `[Unreleased]`.

## Recipe — add a filter (e.g. `truncate`, `currency`)

1. Test first: golden/unit cases in `test/` including the **wrong-input-type** case
   (a filter fed the wrong type must pass the value through unchanged + emit the
   ML203 warning — never throw).
2. Implement under `src/filters/` with a typed signature; register it in the
   built-in filter table. Host-supplied filters arrive via `registerFilter` /
   `ValidateOptions.filters` — don't hardcode host concerns (e.g. locale).
3. Typecheck path: `validate()` must flag `ML203 filter-type-mismatch` at edit time
   for a bad input type; render path passes through + warns.

## Recipe — add a lint rule (e.g. a new ML### code)

1. Test the diagnostic exactly: `code`, `severity`, `range` (1-based, end-exclusive),
   `fieldPath`, and each `quickfix` (title + edits). Snapshot it.
2. Implement as a `LintRule` in `src/rules/`. **Generic** language rules ship
   built-in; **policy** rules (product-specific, e.g. block private-field
   interpolation) must stay host-registered via `registerRule` — do NOT bake host
   policy into the package.
3. Add the code to the diagnostics catalog in `README.md`.

## Recipe — add an operator / AST node

1. Extend the `Expr`/`Node` union in `src/types.ts` (additive only).
2. Parser: produce the node. Typecheck: enforce the operator×type matrix (bad
   combos are edit-time errors and evaluate to `false` at runtime — never throw).
3. Render: evaluate with short-circuit + safe navigation (deep access through
   null/undefined yields `false` in conditions, empty string in interpolation).
4. Serializer: round-trip it — `parse(serialize(ast)) ≡ ast` must still hold.
5. Golden case covering it.

## Milestone scope (don't build ahead)

- **0.1** vars, `if/elseif/else`, operators, `and/or/not`, safe nav, `default`
  filter, whitespace hygiene, parse/serialize, rules ML001/101/201/202/220/214.
- **0.2** `for` + loop locals, array/string/number/datetime filters, arithmetic.
- **0.3** `include` (+cycle detect), directives `#priority/#mode/#block`, comments.

Pulling a later-milestone feature forward needs a plan update first.

## Reference (this package only)

- Language reference — types, operators, filters, blocks, diagnostics: [`docs/`](../../../docs/).
- Public API: [`docs/api.md`](../../../docs/api.md) and the type contract in `src/types.ts`.
- Runnable examples: [`examples/`](../../../examples/).
- Always-on repo rules: `CLAUDE.md`.
