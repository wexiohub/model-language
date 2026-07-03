# Public API

Everything the package exports. The full type contract lives in
[`src/types.ts`](../src/types.ts).

```ts
import {
  parse, serialize, validate, render, registerFilter, registerRule,
} from '@wexio/model-language';
import type {
  FieldSchema, FieldDef, MLType, DataSnapshot,
  Diagnostic, RenderResult, ValidateResult, TemplateNode,
} from '@wexio/model-language';
```

---

## `parse(source)`

```ts
function parse(source: string): { ast: TemplateNode; diagnostics: Diagnostic[] };
```

Turns template text into an AST. Reports syntax problems (`ML0xx`) in
`diagnostics`. **Recovers** from mid-typing/malformed input — one broken line
never invalidates the rest, and the function never throws.

```ts
const { ast, diagnostics } = parse('Hi {{user.name}}!');
```

---

## `serialize(ast)`

```ts
function serialize(ast: TemplateNode): string;
```

Renders an AST back to canonical template text with deterministic whitespace.
Invariant: `parse(serialize(ast))` is structurally equal to `ast`.

---

## `validate(source, schema, opts?)`

```ts
function validate(
  source: string,
  schema: FieldSchema,
  opts?: ValidateOptions,
): { ast: TemplateNode; diagnostics: Diagnostic[]; maxTokenEstimate: number | null };
```

The **editor path**. Parses, then typechecks against `schema`: unknown fields,
type mismatches, bad enum values, wrong filter signatures, the operator × type
matrix, and more. Returns diagnostics with `code`, `severity`, `range`, and
optional `quickfixes`. `maxTokenEstimate` is the worst-case rendered size (for a
prompt-budget warning), or `null` if the template does not parse.

`opts`:
- `agentId?` — validate `#block` actions against a specific agent's action registry.
- `rules?: LintRule[]` — extra host-registered rules for this call.
- `filters?: FilterDef[]` — extra host-registered filters for this call.

See the [diagnostics catalog](./diagnostics.md) for every code.

---

## `render(ast, snapshot, schema)`

```ts
function render(
  ast: TemplateNode,
  snapshot: DataSnapshot,
  schema: FieldSchema,
): { text: string; warnings: Diagnostic[]; resolvedBranches: Branch[]; tokenEstimate: number };
```

The **runtime path**. Evaluates the AST against a typed data `snapshot` and
returns the final string. **Never throws, never leaks syntax** — every runtime
problem degrades gracefully (empty string / false branch) and is recorded in
`warnings` (`ML3xx`). `resolvedBranches` lists which conditions fired with what
result — the "why did the agent say X?" trail.

```ts
const { text, warnings, resolvedBranches } = render(
  ast,
  { user: { name: 'vasyl', plan: 'pro' } },
  schema,
);
```

---

## `registerFilter(def)`

```ts
function registerFilter(def: FilterDef): void;
```

Add a host-supplied filter (e.g. a locale-aware `currency`). A filter must be
total — on the wrong input type it passes the value through and the engine emits
`ML203`; it never throws. See [filters](./filters/README.md).

---

## `registerRule(rule)`

```ts
function registerRule(rule: LintRule): void;
```

Add a host-supplied lint rule. Use this for **policy** rules specific to your host
(e.g. "never interpolate a private field") — the package ships only the generic
language rules. See [diagnostics](./diagnostics.md).

---

## Key types

- `MLType` — `'string' | 'number' | 'boolean' | 'datetime' | 'array' | 'enum' | 'multiEnum' | 'object' | 'dynamic'`.
- `FieldDef` — `{ path, type, nullable?, values?, items?, private?, computed?, name?, description? }`.
- `FieldSchema` — `FieldDef[]`, host-supplied.
- `DataSnapshot` — nested plain JSON with typed values, host-built.
- `Diagnostic` — `{ code, severity, message, range, fieldPath?, quickfixes? }`.

Full definitions: [`src/types.ts`](../src/types.ts).
