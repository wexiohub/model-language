# @wexio/model-language

> A typed, safe, compile-time-resolved **template language for AI-agent prompts**.
> Non-technical users write templates with variables, conditions, and loops; the
> engine renders them into clean prompts against live data. **Never crashes,
> never leaks syntax.**

> ⚠️ **Status: 0.1c — interpolation, conditionals, and editor lint rules shipped.**
> The public API below is stable and final. Today `{{ path | default: "…" }}`
> interpolation and `{{if …}}{{elseif …}}{{else}}{{/if}}` conditionals render for
> real, and `validate()` returns typed diagnostics (unknown field/filter, type
> mismatch, enum typos, `==`-on-multi-select, raw dates). Loops, more filters, and
> arithmetic land in 0.2.

---

## Why

AI agents need prompts that adapt to who they're talking to — "if this is a
qualified lead with high interest, do X; if a past-due subscription exists, do
Y". Writing that as code doesn't scale to non-technical operators, and stuffing
raw data into a prompt is unsafe. Model Language (ML) lets a support manager
express that logic in plain, readable templates. The engine:

1. **Parses** the template into an AST.
2. **Typechecks** it against a field schema — typos, wrong types, and impossible
   branches are caught at edit time, not in production.
3. **Renders** it against a live data snapshot — a pure function that **never
   throws** and produces a prompt with zero ML syntax in it.

The language is host-agnostic: it knows nothing about any particular product's
data. The host supplies a `FieldSchema` and a typed `DataSnapshot`; the engine
does the rest.

## Install

```bash
pnpm add @wexio/model-language
```

## Quickstart

```ts
import { validate, parse, render, type FieldSchema } from '@wexio/model-language';

const schema: FieldSchema = [
  { path: 'user.name', type: 'string', nullable: true },
  { path: 'user.plan', type: 'enum', values: ['free', 'pro', 'team'] },
];

const source = `Hi {{user.name | default: "there"}}!
{{if user.plan == "pro"}}Priority support is on.{{/if}}`;

// Editor path — diagnostics for squiggles + quickfixes.
const { diagnostics } = validate(source, schema);

// Runtime path — render against a typed snapshot. Never throws.
const { ast } = parse(source);
const { text, warnings, resolvedBranches } = render(
  ast,
  { user: { name: 'vasyl', plan: 'pro' } },
  schema,
);
// text → "Hi vasyl!\nPriority support is on."
```

## The language (at a glance)

```
{{user.name | default: "there"}}                 variables + filter pipelines
{{if x == "a" or y > 3}} … {{elseif …}} … {{else}} … {{/if}}   conditionals
{{for item in order.items | limit: 3}} … {{/for}}             loops
{{if user.csm exists}} … {{/if}}                 null-safe existence checks
{{if user.tags contains "vip"}} … {{/if}}        array / multi-select membership
{{# a comment, never rendered #}}
```

Types: `string · number · boolean · datetime · array · enum · multiEnum ·
object · dynamic` (+ `null` vs `undefined`). Dates are compared through filters
(`| days_ago > 30`), never raw. See the full grammar and reference below.

## Public API

| Function | Purpose |
|---|---|
| `parse(source)` | text → `{ ast, diagnostics }` (with error recovery) |
| `serialize(ast)` | AST → canonical text (deterministic whitespace) |
| `validate(source, schema, opts?)` | typecheck → `{ ast, diagnostics, maxTokenEstimate }` |
| `render(ast, snapshot, schema)` | AST + data → `{ text, warnings, resolvedBranches, tokenEstimate }` — **never throws** |
| `registerFilter(def)` | add a host filter (e.g. locale-aware `currency`) |
| `registerRule(rule)` | add a host lint rule (e.g. private-field policy) |

Full type contract: [`src/types.ts`](./src/types.ts).

## Documentation

Complete reference in [`docs/`](./docs/):

- [Getting started](./docs/getting-started.md) · [Public API](./docs/api.md)
- [Variables](./docs/variables.md) · [Types](./docs/types/README.md)
  ([`null` vs `undefined`](./docs/types/null-vs-undefined.md)) ·
  [Conditionals](./docs/conditionals.md) · [Loops](./docs/loops.md)
- [Math & functions](./docs/functions.md) · [Filters](./docs/filters/README.md) ·
  [Directives & includes](./docs/directives.md)
- [Diagnostics catalog](./docs/diagnostics.md)

Runnable templates with data + expected output: [`examples/`](./examples/).

## Project structure

```
src/
  index.ts       public barrel (API + types)
  engine.ts      composition root — validate()
  types.ts       public type contract
  diagnostics/   ML### code catalog + Diagnostic factory
  parser/        lexer → parser → serializer  (source ↔ AST)
  typecheck/     AST × schema → diagnostics
  render/        AST × data → final string (never throws)
  filters/       filter registry (+ registerFilter)
  rules/         lint-rule registry (+ registerRule)
test/            golden + per-module unit + fuzz + round-trip
docs/            language reference
examples/        runnable templates
```

Contributor guide: [`CLAUDE.md`](./CLAUDE.md). Editing playbook:
[`.claude/skills/model-language`](./.claude/skills/model-language/SKILL.md).

## Roadmap

The language ships in milestones, each a publishable minor release:

- **0.1a** ✅ — variables `{{ path | default }}`, safe navigation,
  stringification, the `default` filter, canonical `parse`/`serialize`,
  conformance suite.
- **0.1b** ✅ — `if/elseif/else`, comparison/logical operators, `and/or/not`,
  `exists`/`in`/`contains`/`startsWith`/`endsWith`/`matches`, truthiness,
  whitespace hygiene.
- **0.1c** ✅ — typecheck lint rules (ML101 unknown-field + suggestions, ML102
  unknown-filter, ML201 type-mismatch, ML202 unknown-enum-value, ML214 raw-date,
  ML220 `==`→`contains`).
- **0.2** — `for` loops + loop locals, array/string/number/datetime filters,
  arithmetic + `calculate()`.
- **0.3** — `include` (with cycle detection), directives (`#priority`, `#mode`,
  `#block`), comments.

Each milestone is gated on the golden acceptance suite (see below).

## Development

```bash
pnpm install
pnpm test          # vitest — golden + unit + fuzz + round-trip
pnpm lint          # Biome
pnpm typecheck     # tsc --noEmit
pnpm build         # tsup → dist (ESM + CJS + .d.ts)
```

### Testing philosophy

- **Golden suite is the contract.** Acceptance cases are executable; breaking one
  is a breaking semver change.
- **Examples-as-tests.** Every code example in the docs runs as a test — docs
  can't drift from behavior.
- **Fuzz the prime directive.** Thousands of random and malformed inputs assert
  `render()` never throws and `parse()` always recovers.
- **Round-trip invariant.** `parse(serialize(ast)) ≡ ast`.

## License

MIT © Wexio
