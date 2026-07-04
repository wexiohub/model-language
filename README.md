# model-language

> A typed, safe template language for **AI-agent prompts** — write once, run in
> eight languages.

[![npm](https://img.shields.io/npm/v/model-language?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/model-language)
[![PyPI](https://img.shields.io/pypi/v/model-language?label=PyPI&color=3775a9&logo=pypi&logoColor=white)](https://pypi.org/project/model-language/)
[![crates.io](https://img.shields.io/crates/v/model-language?label=crates.io&color=e6b34c&logo=rust&logoColor=white)](https://crates.io/crates/model-language)
[![RubyGems](https://img.shields.io/gem/v/model-language?label=gem&color=cc342d&logo=rubygems&logoColor=white)](https://rubygems.org/gems/model-language)
[![NuGet](https://img.shields.io/nuget/v/ModelLanguage?label=NuGet&color=004880&logo=nuget&logoColor=white)](https://www.nuget.org/packages/ModelLanguage)
[![Hex](https://img.shields.io/hexpm/v/model_language?label=hex&color=6e4a7e&logo=elixir&logoColor=white)](https://hex.pm/packages/model_language)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

model-language lets non-technical users write prompts with variables, conditions,
loops, and filters. The engine type-checks them against your data schema and
renders them into clean prompts against live data — it **never crashes and never
leaks template syntax**. One canonical TypeScript engine, compiled to WebAssembly,
runs **byte-for-byte identically** in JavaScript, Python, Rust, Ruby, C#, C++, Go,
and Elixir — verified by a shared conformance suite in CI.

**Learn more:** [documentation](./docs/) · [runnable examples](./examples/) ·
[language hosts](./hosts/) · [contributing](./CONTRIBUTING.md)

## Installation

You will need Node.js 18+ and npm (or another package manager).

```bash
npm install model-language
```

For Python (3.9+), the same engine ships via a WebAssembly module:

```bash
pip install model-language
```

## Rendering a prompt

Parse once, render many. `render()` is a pure function — it never throws, and the
output has zero template syntax left in it.

```ts
import { parse, render, type FieldSchema } from 'model-language';

const schema: FieldSchema = [
  { path: 'user.name', type: 'string', nullable: true },
  { path: 'user.plan', type: 'enum', values: ['free', 'pro', 'team'] },
];

const source = `Hi {{user.name | default: "there"}}!
{{if user.plan == "pro"}}Priority support is on.{{/if}}`;

const { ast } = parse(source);
const { text } = render(ast, { user: { name: 'vasyl', plan: 'pro' } }, schema);
// text → "Hi vasyl!\nPriority support is on."
```

## Validating in the editor

`validate()` type-checks a template against the schema and returns stable
`ML###` diagnostics for live squiggles, quickfixes, and a worst-case token
estimate — so authoring mistakes are caught at edit time, not in production.

```ts
import { validate } from 'model-language';

const { diagnostics, maxTokenEstimate } = validate(
  '{{if user.plan == "premium"}}...{{/if}}',
  [{ path: 'user.plan', type: 'enum', values: ['free', 'pro'] }],
);
// diagnostics → [{ code: 'ML202', message: "'premium' is not a valid value…", … }]
```

Examples: `ML101` unknown-field (with a "did you mean" suggestion), `ML102`
unknown-filter, `ML201` type-mismatch, `ML210` missing-`default` on a nullable
field, `ML213` prompt-over-budget, `ML214` raw-date-comparison, `ML220`
`==`-on-multi-select (quickfix to `contains`). Full list:
[diagnostics catalog](./docs/diagnostics.md).

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

**Operators** — `== != < > <= >=`, `and / or / not`, `in`, `contains`,
`contains_any`, `contains_all`, `is_empty`, `exists`, `startsWith`, `endsWith`,
`matches`.

**Filters** (total — the wrong input type passes through, never throws):
- text: `upper` `lower` `trim` `capitalize` `truncate` `replace` `default`
- number: `round` `floor` `ceil` `abs` `percent` `currency`
- array: `count` `join` `first` `last` `limit` `pluck` `where` `sort` `sum`
  `max` `min`
- datetime: `days_ago` `days_until` `is_past` `is_future` `date`

**Types** — `string · number · boolean · datetime · array · enum · multiEnum ·
object · dynamic`, plus `null` (present-but-empty) vs `undefined` (missing).
Dates are compared through filters (`| days_ago > 30`), never raw.

## Python

The same engine — the TypeScript build compiled to a WebAssembly module and
hosted with `wasmtime` — produces byte-for-byte identical output.

```python
from model_language import render, validate

out = render(
    "Hi {{ user.name | default: 'there' }}!",
    data={"user": {"name": "Vasyl"}},
)
print(out["text"])  # -> "Hi Vasyl!"
```

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

Cost scales **linearly** with template size — logical rules never blow up (each
condition is short-circuit-evaluated once). Numbers and methodology:
[`bench/RESULTS.md`](./bench/RESULTS.md).

## Other languages

The engine is compiled **once** to a self-contained WebAssembly (WASI) module and
called over a stable JSON contract, so hosts don't reimplement the language — the
same `.wasm` produces byte-for-byte identical output everywhere, verified against
the shared [conformance suite](./conformance/) in CI.

| Language | Install | Package | Host |
|---|---|---|---|
| JavaScript | `npm i model-language` | [npm](https://www.npmjs.com/package/model-language) | this package |
| Python | `pip install model-language` | [PyPI](https://pypi.org/project/model-language/) | [`hosts/python`](./hosts/python) |
| Rust | `cargo add model-language` | [crates.io](https://crates.io/crates/model-language) | [`hosts/rust`](./hosts/rust) |
| Ruby | `gem install model-language` | [RubyGems](https://rubygems.org/gems/model-language) | [`hosts/ruby`](./hosts/ruby) |
| C# | `dotnet add package ModelLanguage` | [NuGet](https://www.nuget.org/packages/ModelLanguage) | [`hosts/csharp`](./hosts/csharp) |
| Elixir | `{:model_language, "~> 1.0"}` | [Hex](https://hex.pm/packages/model_language) | [`hosts/elixir`](./hosts/elixir) |
| Go | `go get …/hosts/go` | — (git) | [`hosts/go`](./hosts/go) |
| C++ | vendor + the C API | — (vendor) | [`hosts/cpp`](./hosts/cpp) |

Each package embeds the module — nothing else to install. See
[`hosts/`](./hosts/) for a guide to hosting in any other WASI language, and
[`RELEASING.md`](./RELEASING.md) for the publish flow.

## Documentation

Complete reference in [`docs/`](./docs/):

- [Getting started](./docs/getting-started.md) · [Public API](./docs/api.md)
- [Variables](./docs/variables.md) · [Types](./docs/types/README.md) ·
  [Conditionals](./docs/conditionals.md) · [Loops](./docs/loops.md)
- [Math & functions](./docs/functions.md) · [Filters](./docs/filters/README.md) ·
  [Directives & includes](./docs/directives.md) · [Diagnostics](./docs/diagnostics.md)

Runnable templates with data + expected output live in [`examples/`](./examples/);
language-neutral golden fixtures (the cross-host contract) in
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

The golden/conformance suite is the contract — breaking a case is a breaking
change. Every doc example runs as a test (docs can't drift), fuzzing asserts the
prime directive (`render()` never throws, `parse()` always recovers), and the
round-trip invariant holds: `parse(serialize(ast)) ≡ ast`.

## Contributing

Contributions welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md). The engine is
one canonical TypeScript implementation; the [conformance suite](./conformance/)
is the contract, and coverage is a hard 100% gate. Security issues:
[`SECURITY.md`](./SECURITY.md).

## License

MIT © Wexio
