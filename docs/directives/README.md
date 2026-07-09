# Inline Directives

Inline directives embed machine-readable instructions inside a prompt template.
They are stripped from the rendered text and surfaced as structured data in
`render().directives`, where the host (e.g. the backend) consumes them as runtime
constraints — routing decisions, tool gates, assignment rules.

```
{{verify_before: calendar}}
{{identity: contact.email == payment.email}}
{{assignedTo: [id1, id2]}}
{{assignedToFallback: [id3]}}
{{assignedToRoles: [AGENT, EDITOR]}}
{{assignedToMaxCount: 3}}
```

## Grammar

```
{{ name : arg }}
```

- `name` — a bare identifier (`[a-zA-Z_][a-zA-Z0-9_]*`).
- `arg` — everything after the top-level colon, up to `}}`, trimmed.

**Directive vs value token.** The engine classifies a token at parse time with no
vocabulary needed: a top-level `identifier :` (a colon appearing before any `|`
filter separator) is a directive. Anything else is a value expression.

```
{{verify_before: calendar}}        directive — top-level colon
{{contact.email}}                  value — no colon
{{contact.name | default: "x"}}   value — colon is inside the filter, not top-level
```

Block `#`-directives (`{{#priority}}…{{/priority}}`) are a separate, unchanged
form that wraps a body. Inline directives are bodyless.

## DirectiveSpec and DirectiveArgSpec

The host supplies a `DirectiveSpec[]` vocabulary to `validate()` and (optionally)
to the engine at render time. The engine never hardcodes a directive list.

```ts
interface DirectiveSpec {
  name: string;            // 'verify_before' | 'identity' | ...
  arg: DirectiveArgSpec | null;  // null → directive takes no argument
  hasBody: false;          // all inline directives are bodyless
  description?: string;    // autocomplete / help text in the editor
}

interface DirectiveArgSpec {
  kind: 'scalar' | 'list' | 'comparison';
  type: 'number' | 'text' | 'id' | 'enum' | 'field';
  values?: string[];       // enum: closed set of allowed values
  comparison?: {           // kind: 'comparison' only
    operators: string[];   // allowed operators from the condition grammar, e.g. ['==']
    operandType: 'field' | 'text';
  };
}
```

### Argument kinds

| kind | Shape | Example |
|------|-------|---------|
| `scalar` | a single value — no commas, no comparison | `{{verify_before: calendar}}`, `{{assignedToMaxCount: 10}}` |
| `list` | `[a, b, c]` brackets (canonical) or bare comma-separated list | `{{assignedTo: [id1, id2]}}`, `{{assignedToRoles: [AGENT, EDITOR]}}` |
| `comparison` | `<left> <op> <right>` — a single comparison from the condition grammar | `{{identity: contact.email == payment.email}}` |

## The six built-in specs

The six directives used by AI Skills. The engine validates shape and enum
membership; semantic checks (is this a real operator id? a real tool category?)
stay in the backend.

```ts
const DIRECTIVES: DirectiveSpec[] = [
  {
    name: 'verify_before',
    hasBody: false,
    arg: { kind: 'scalar', type: 'enum', values: ['payments', 'calendar', 'crm'] },
  },
  {
    name: 'identity',
    hasBody: false,
    arg: {
      kind: 'comparison',
      type: 'field',
      comparison: { operators: ['=='], operandType: 'field' },
    },
  },
  {
    name: 'assignedTo',
    hasBody: false,
    arg: { kind: 'list', type: 'id' },
  },
  {
    name: 'assignedToFallback',
    hasBody: false,
    arg: { kind: 'list', type: 'id' },
  },
  {
    name: 'assignedToRoles',
    hasBody: false,
    arg: { kind: 'list', type: 'enum', values: ['OWNER', 'ADMIN', 'EDITOR', 'AGENT'] },
  },
  {
    name: 'assignedToMaxCount',
    hasBody: false,
    arg: { kind: 'scalar', type: 'number' },
  },
];
```

## Validation

Pass `directives` as part of the third options argument to `validate()`:

```ts
import { validate } from 'model-language';

const result = validate(source, schema, { directives: DIRECTIVES });
// result.diagnostics contains ML240–ML244 for directive problems
```

When `directives` is omitted, inline directive tokens are still parsed and
surfaced in `render().directives`, but no name or argument validation is
performed. Existing callers are unaffected.

### parseDirectiveArg

`parseDirectiveArg` is also exported for hosts that need to parse a directive
argument outside the `validate()` call:

```ts
import { parseDirectiveArg } from 'model-language';

const result = parseDirectiveArg('calendar', verifyBeforeSpec);
// { ok: true, value: 'calendar' }

const bad = parseDirectiveArg('billing', verifyBeforeSpec);
// { ok: false, code: 'ML243' }
```

## Diagnostic codes (ML240–ML244)

| Code | Meaning |
|------|---------|
| `ML240` | Unknown directive — name not in the supplied `DirectiveSpec[]` |
| `ML241` | Missing required argument — the directive requires an argument but none was given |
| `ML242` | Argument shape/type mismatch — list where a scalar is expected, non-number where a number is expected, non-comparison where a comparison is required, or a disallowed operator |
| `ML243` | Enum value not in `values` — the supplied value is not in the directive's allowed set |
| `ML244` | Unexpected/extra argument — a comparison where none is allowed, an `or`/`and` chain, stray tokens, or a directive with `arg: null` given a non-empty argument |

All directive problems are reported at authoring time by `validate()`, not at
render time — so the template author sees them as editor squiggles, not as
runtime failures.

## Conditional firing

A directive inside a `{{if}}` branch fires (appears in `render().directives`)
only when that branch is actually rendered:

```
{{if contact.plan == "pro"}}{{verify_before: payments}}Pro billing.{{/if}}Ask how I can help.
```

- When `contact.plan == "pro"` is true: `directives: [{ name: 'verify_before', params: { raw: 'payments' } }]`, text `"Pro billing.Ask how I can help."`
- Otherwise: `directives: []`, text `"Ask how I can help."` — the payment gate is not applied for this visitor.

`validate()` always checks directives in all branches regardless of which branch
renders, so authoring errors surface even inside a condition that won't run at
author time.

## Worked example

```ts
import { parse, render, validate } from 'model-language';
import type { DirectiveSpec, FieldSchema } from 'model-language';

const DIRECTIVES: DirectiveSpec[] = [
  { name: 'verify_before', hasBody: false, arg: { kind: 'scalar', type: 'enum', values: ['payments', 'calendar'] } },
  { name: 'identity', hasBody: false, arg: { kind: 'comparison', type: 'field', comparison: { operators: ['=='], operandType: 'field' } } },
  { name: 'assignedTo', hasBody: false, arg: { kind: 'list', type: 'id' } },
];

const SCHEMA: FieldSchema = [
  { path: 'contact.email', type: 'string' },
  { path: 'contact.first_name', type: 'string' },
];

const src = [
  'Help with billing.',
  '{{verify_before: payments}}',
  '{{identity: contact.email == payment.email}}',
  'Greet {{contact.first_name | default: "there"}}.',
].join('\n');

// Validate — zero errors
const { diagnostics } = validate(src, SCHEMA, { directives: DIRECTIVES });
console.log(diagnostics.filter(d => d.severity === 'error')); // []

// Render — directives are stripped from text, surfaced as data
const r = render(parse(src).ast, { contact: { first_name: 'Vasyl' } }, SCHEMA);
console.log(r.text);
// 'Help with billing.\n\nGreet Vasyl.'
//  ^ directive-only lines are absorbed by block-line trimming; the remaining
//    blank line is collapsed by the final whitespace pass.

console.log(r.directives.map(d => d.name));
// ['verify_before', 'identity']
```

The rendered text is `'Help with billing.\n\nGreet Vasyl.'`. The two directive
lines are absorbed at parse time (block-line trimming strips a line that contains
only a tag), and the resulting consecutive newlines are collapsed to a single
blank line by the final `tidyWhitespace` pass.
