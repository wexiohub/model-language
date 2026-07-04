# Getting started

## Install

```bash
pnpm add model-language
# or: npm i model-language / yarn add model-language
```

Zero runtime dependencies. Ships ESM + CJS + type declarations.

## Mental model

A template is **smart fill-in-the-blanks**, not a programming language. You write
prose with three kinds of dynamic constructs:

- **Variables** — `{{user.name}}` inserts a value.
- **Conditions** — `{{if …}} … {{/if}}` include text only when something is true.
- **Loops** — `{{for item in …}} … {{/for}}` repeat text per array item.

The engine turns a template into a final string. The LLM (or whatever consumes the
output) never sees any `{{ }}` — only the rendered result.

## The two paths

The same template feeds two code paths:

| Path | Function | When | Purpose |
|---|---|---|---|
| **Editor** | `validate(source, schema)` | while authoring | diagnostics (squiggles) + quickfixes, before anything runs |
| **Runtime** | `parse(source)` then `render(ast, data, schema)` | at send time | the final string, plus a warnings report |

`render()` is a pure function and **never throws** — a broken template still
produces the best possible output, with problems collected as warnings.

## First template

```ts
import { parse, render, validate, type FieldSchema } from 'model-language';

const schema: FieldSchema = [
  { path: 'user.name', type: 'string', nullable: true },
  { path: 'user.plan', type: 'enum', values: ['free', 'pro', 'team'] },
];

const source = `Hi {{user.name | default: "there"}}!
{{if user.plan == "pro"}}You're on Pro — priority support is on.{{/if}}`;

// Editor path
const { diagnostics } = validate(source, schema);   // [] when the template is clean

// Runtime path
const { ast } = parse(source);
const { text } = render(ast, { user: { name: 'vasyl', plan: 'pro' } }, schema);
// text → "Hi vasyl!\nYou're on Pro — priority support is on."
```

## Where the data comes from

`render` takes a **typed** `DataSnapshot` — a nested plain object your host builds
(from a database, an API, wherever). The `FieldSchema` describes the shape and
types so the engine can validate and coerce correctly. The package is
host-agnostic: it never fetches anything itself.

## Next

- [Public API](./api.md)
- [Variables](./variables.md) · [Conditionals](./conditionals.md) ·
  [Types](./types/README.md)
- [Examples](../examples/)
