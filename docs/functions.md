# Math & functions

**Arithmetic + `calculate()` → milestone 0.2. Async functions → Phase 4.**

Math, `calculate()`, and future helpers (`fetch`, domain functions) are **one
extensible model**, alongside [filters](./filters/README.md) and
[lint rules](./diagnostics.md). Hosts add their own with `registerFunction`
(sibling of `registerFilter` / `registerRule`).

## Inline arithmetic

`+ - * /` and parentheses work inside interpolation and conditions:

```
{{if user.score >= user.range + 1}} … {{/if}}
Access is suspended in {{ 14 - subscription.days_past_due }} days.
Per-seat: {{ (order.total - order.discount) / order.seats | round: 2 }}
```

## `calculate(expr, decimals?)`

A built-in function — sugar for arithmetic + `round`. `decimals` = places after
the point; `0` or omitted = whole number.

```
{{ calculate(10 / 333, 2) }}      → 0.03
{{ calculate(user.a * user.b) }}  → integer
```

`calculate(x, n)` is exactly `{{ x | round: n }}` — use whichever reads better.

## Rounding & precision

`round: n` uses **half away from zero** ("school" rounding). For explicit control
there are `floor`, `ceil`, `truncate: n`, `abs`.

| Value | Filter | Result |
|---|---|---|
| `2.5` | `round` | `3` |
| `2.4` | `round` | `2` |
| `-2.5` | `round` | `-3` |
| `2.55` | `round: 1` | `2.6` |
| `2.9` | `floor` | `2` |
| `2.1` | `ceil` | `3` |
| `2.99` | `truncate: 1` | `2.9` |

## Type safety — no JavaScript coercion

Arithmetic is **numbers only**. Bad operands are caught at edit time; anything
that slips through degrades to `undefined` (empty on interpolation, `false` in a
comparison) — never `NaN`, never `0`, never a throw.

| Expression | Edit-time | Runtime |
|---|---|---|
| `"5" * 2` (string field) | ❌ `ML201` | — |
| `user.name + 5` (`+` is not concat) | ❌ `ML201` | — |
| `null * 2` / missing operand | ok (number field) | `undefined` + `ML306` (not `0`) |
| `user.custom.score * 2` (`dynamic` `"15"`) | ok | `30` (numeric string parses) |
| `user.custom.score * 2` (`dynamic` `"abc"`) | ok | `undefined` + `ML303` |
| `x / 0` | ok | empty + `ML305` |
| overflow / `Infinity` | — | `undefined` + warning |

To join text, write adjacent interpolations (`{{a}}{{b}}`), never `a + b`.

## Functions & member access

A function returns a value you can member-access or pipe:

```
{{if fetch(org.api_url).result.count == 1}} … {{/if}}
{{ lookup(user.email).plan | upper }}
```

Grammar: a **call expression** `name(args…)` plus **member access** on any
expression.

## Async — you never write `await`

`render()` stays **pure and synchronous** (the prime directive). Functions declare
a kind:

- **pure/sync** (`calculate`, math, string) — evaluated during render.
- **async/effectful** (`fetch`, external lookups) — resolved in a **bounded,
  parallel, cached pre-pass** *before* render (the same machinery as external
  [data providers](./README.md)), then render runs synchronously against the
  results.

So a template author writes `fetch(url).result.count` and the engine does the
awaiting outside render. A failed or timed-out async call → its value is
`undefined` + a warning (`ML310`); the condition simply goes `false` and the
prompt still ships. Never hangs, never throws.

## See also

- [Variables](./variables.md) · [Filters](./filters/README.md) ·
  [Conditionals](./conditionals.md) · [Diagnostics](./diagnostics.md)
