# Variables & interpolation

**Shipped in 0.1a** — interpolation, safe navigation, stringification, and the
`default` filter render today. (Arithmetic and other filters land in 0.2.)

An interpolation inserts a value into the output:

```
Hi {{user.name}}!
```

The expression is a **field path** (dot notation). Paths are safe — deep access
through a missing parent yields an empty string (plus a warning), never an error.

## Filter pipelines

Pipe a value through one or more [filters](./filters/README.md) with `|`:

```
{{user.name | default: "there"}}
{{user.created_at | date: "MMM D, YYYY"}}
{{order.total | currency: "USD"}}
{{user.bio | trim | truncate: 80}}
```

Each filter has a typed signature. Feeding a filter the wrong input type is an
edit-time lint error (`ML203`); at runtime the value passes through unchanged with
a warning — never a crash.

## Stringification

Interpolation stringifies everything (this is the humane exception to strict
typing):

| Value | Renders as |
|---|---|
| `"vasyl"` | `vasyl` |
| `500` | `500` |
| `true` | `true` |
| `["beta", "vip"]` (array / multiEnum) | `beta, vip` |
| datetime | ISO 8601 (use `\| date:` to format) |
| `null` / `undefined` | `` (empty) + `ML301` unless `\| default` |
| object | `` (empty) + `ML302` warning |

## Arithmetic & math (0.2)

Arithmetic (`+ - * /`, parentheses) works inside interpolation and comparisons,
and is strictly numbers-only — no JavaScript coercion:

```
Access will be suspended in {{14 - subscription.days_past_due}} days.
```

Full rules — `calculate()`, rounding/precision, and the type-safety table
(`"5" * 2`, `null * 2`, etc.) — are in **[Math & functions](./functions.md)**.
There are no user-defined variables or assignments; the mental model stays
"fill-in + branching", not programming.

## Private fields

A field marked `private` in the schema **cannot be interpolated** (a host policy
rule such as `ML230` blocks it) — rendering a phone number or token into a prompt
is a data-exfiltration path. Private fields may still be used in **conditions**
(`{{if user.phone exists}}`), which leak nothing.

## See also

- [Filters](./filters/README.md) · [Types](./types/README.md) ·
  [`null` vs `undefined`](./types/null-vs-undefined.md)
