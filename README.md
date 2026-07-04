# model-language

> A typed, safe, compile-time-resolved **template language for AI-agent prompts**.
> Non-technical users write prompts with variables, conditions, loops, and
> filters; the engine type-checks them against your data schema and renders them
> into clean prompts against live data. **Never crashes, never leaks syntax.**

**Status: feature-complete.** Variables, conditionals, loops, the full filter
set, arithmetic + `calculate()`, directives, includes, comments, and the editor
lint set all ship. The engine is pure TypeScript with a **100% test-coverage
gate**, and runs in **JavaScript natively** and **Python via a WebAssembly
module** (any WASI host can run the same binary).

---

## Why

AI agents need prompts that adapt to who they're talking to — *"if this is a
qualified lead with high interest, do X; if a past-due subscription exists, do
Y."* Writing that as code doesn't scale to non-technical operators, and stuffing
raw data into a prompt is unsafe. Model Language lets a support manager express
that logic in plain, readable templates. The engine:

1. **Parses** the template into an AST (with error recovery).
2. **Type-checks** it against a field schema — typos, wrong types, raw-date
   comparisons, and budget overruns are caught at edit time, not in production.
3. **Renders** it against a live data snapshot — a pure function that **never
   throws** and produces a prompt with zero template syntax left in it.

The language is host-agnostic: it knows nothing about any product's data. The
host supplies a `FieldSchema` and a typed `DataSnapshot`; the engine does the
rest.

## Install

```bash
npm add model-language      # or pnpm / yarn
pip install model-language  # Python bindings (same engine, via WASM)
```

## Quickstart (JavaScript / TypeScript)

```ts
import { validate, parse, render, type FieldSchema } from 'model-language';

const schema: FieldSchema = [
  { path: 'user.name', type: 'string', nullable: true },
  { path: 'user.plan', type: 'enum', values: ['free', 'pro', 'team'] },
];

const source = `Hi {{user.name | default: "there"}}!
{{if user.plan == "pro"}}Priority support is on.{{/if}}`;

// Editor path — diagnostics for squiggles + quickfixes, and a token estimate.
const { diagnostics, maxTokenEstimate } = validate(source, schema);

// Runtime path — parse once, render many. render() never throws.
const { ast } = parse(source);
const { text, warnings, resolvedBranches } = render(
  ast,
  { user: { name: 'vasyl', plan: 'pro' } },
  schema,
);
// text → "Hi vasyl!\nPriority support is on."
```

## Quickstart (Python)

Same engine, same output — the TS engine compiled to a WASI module and hosted
with `wasmtime`:

```python
from model_language import render, validate

out = render(
    "Hi {{ user.name | default: 'there' }}!",
    data={"user": {"name": "Vasyl"}},
)
print(out["text"])  # -> "Hi Vasyl!"
```

## The language

```
{{ user.name | default: "there" }}                variables + filter pipelines
{{ (order.total - order.discount) | round: 2 }}   arithmetic (+ - * /, parens)
{{ calculate(user.mrr / user.seats, 2) }}         calculate(expr, decimals?)

{{if x == "a" or y > 3}} … {{elseif …}} … {{else}} … {{/if}}   conditionals
{{if user.csm exists}} … {{/if}}                  null-safe existence checks
{{if user.tags contains "vip"}} … {{/if}}         array / multi-select membership

{{for item in order.items | where: "status", "==", "open" | limit: 3}}
  - {{ item.title }} (#{{ loop.index }}/{{ loop.count }})
{{else}}
  No open items.
{{/for}}

{{#priority high}} … {{/priority}}                runtime directives → RenderResult
{{include "signature"}}                           reusable snippets (cycle-guarded)
{{# a comment, never rendered #}}
```

**Operators.** `== != < > <= >=`, `and / or / not`, `in`, `contains`,
`contains_any`, `contains_all`, `is_empty`, `exists`, `startsWith`, `endsWith`,
`matches`.

**Filters (total — wrong input passes through, never throws):**
- text: `upper` `lower` `trim` `capitalize` `truncate` `replace` `default`
- number: `round` `floor` `ceil` `abs` `percent` `currency`
- array: `count` `join` `first` `last` `limit` `pluck` `where` `sort` `sum`
  `max` `min`
- datetime: `days_ago` `days_until` `is_past` `is_future` `date`

**Types.** `string · number · boolean · datetime · array · enum · multiEnum ·
object · dynamic`, plus `null` (present-but-empty) vs `undefined` (missing).
Dates are compared through filters (`| days_ago > 30`), never raw.

## Editor diagnostics

`validate()` returns typed, stable `ML###` diagnostics for live squiggles and
quickfixes — e.g. `ML101` unknown-field (with a "did you mean" suggestion),
`ML102` unknown-filter, `ML201` type-mismatch, `ML202` unknown-enum-value,
`ML210` missing-`default` on a nullable field, `ML213` prompt-over-budget,
`ML214` raw-date-comparison, `ML220` `==`-on-multi-select (quickfix to
`contains`), `ML001` unclosed block. Full list: [diagnostics catalog](./docs/diagnostics.md).

## Public API

| Function | Purpose |
|---|---|
| `parse(source)` | text → `{ ast, diagnostics }` (with error recovery) |
| `serialize(ast)` | AST → canonical text (deterministic whitespace) |
| `validate(source, schema, opts?)` | typecheck → `{ ast, diagnostics, maxTokenEstimate }` |
| `render(ast, snapshot, schema, opts?)` | AST + data → `{ text, warnings, resolvedBranches, directives, tokenEstimate }` — **never throws** |
| `registerFilter(def)` | add a host filter (e.g. locale-aware `currency`) |
| `registerRule(rule)` | add a host lint rule (e.g. a private-field policy) |

Full type contract: [`src/types.ts`](./src/types.ts).

## Performance

**Parse once (cold, cacheable), render many (hot).** Rendering a pre-parsed AST
is the per-message cost; caching it is the whole game.

| Template | render (hot) |
|---|---|
| typical prompt (tens–hundreds of lines) | **13–75 µs** |
| pathological 3,500-line, 500-rule prompt | **~1 ms** |

Cost scales **linearly** with template size — logical rules never blow up
(each condition is short-circuit-evaluated once). Full numbers and methodology:
[`bench/RESULTS.md`](./bench/RESULTS.md).

## Other languages (WASM bridge)

The engine is compiled **once** to a self-contained WASI module and called over a
stable JSON contract, so hosts don't reimplement the language. Python ships today
(CI-verified against the shared conformance suite); the same `.wasm` runs in any
WASI host (Go, Ruby, Rust, Java, Node). See [`wasm/`](./wasm/) and
[`python/`](./python/).

## Documentation & examples

Complete reference in [`docs/`](./docs/):

- [Getting started](./docs/getting-started.md) · [Public API](./docs/api.md)
- [Variables](./docs/variables.md) · [Types](./docs/types/README.md) ·
  [Conditionals](./docs/conditionals.md) · [Loops](./docs/loops.md)
- [Math & functions](./docs/functions.md) · [Filters](./docs/filters/README.md) ·
  [Directives & includes](./docs/directives.md) · [Diagnostics](./docs/diagnostics.md)

Runnable templates with data + expected output: [`examples/`](./examples/).
Language-neutral golden fixtures (the cross-host contract):
[`conformance/`](./conformance/).

## Development

```bash
pnpm install
pnpm test          # vitest — golden + unit + fuzz + round-trip (100% coverage gate)
pnpm bench         # vitest bench — parse / render / validate
pnpm lint          # Biome
pnpm typecheck     # tsc --noEmit
pnpm build         # tsup → dist (ESM + CJS + .d.ts)
pnpm wasm:build    # esbuild bundle → Javy → wasm/dist/model_language.wasm
```

**Testing philosophy.** The golden/conformance suite is the contract — breaking a
case is a breaking change. Every doc example runs as a test (docs can't drift).
Fuzzing asserts the prime directive: `render()` never throws, `parse()` always
recovers. Round-trip invariant: `parse(serialize(ast)) ≡ ast`.

## What's next

The language is feature-complete; remaining work is integrations and tooling:

- **Tiptap package** — edit the language in a rich-text editor (syntax nodes,
  docJson ↔ text) for non-technical authors.
- **More language hosts** — thin Go / Ruby / Rust / Java wrappers over the same
  `.wasm`.
- **Flow-analysis lint** — `ML211` unreachable-branch / `ML212` contradiction
  (branch-domain analysis; codes reserved).

## License

MIT © Wexio
