# Filters

Typed pipeline functions applied with `|`:

```
{{value | filter: arg1, arg2 | nextFilter}}
```

Each filter declares a typed signature. Wrong input type → edit-time lint
(`ML203`); at runtime the value passes through unchanged with a warning — a filter
**never throws**. Hosts add their own with [`registerFilter`](../api.md#registerfilterdef).

## Universal — **shipped (0.1a)**

| Filter | Signature | Example |
|---|---|---|
| `default` | `T? → fallback:T → T` | `{{user.name \| default: "there"}}` — the null-safety workhorse; returns the fallback for `null` / `undefined` / empty string. The fallback may itself be a field: `default: org.default_language` |

## String — **shipped (0.2b)**

`capitalize` · `upper` · `lower` · `trim` · `truncate: n` (adds `…`) ·
`replace: from, to`

```
{{user.bio | trim | truncate: 80}}
```

## Number — **shipped (0.2b)** · `currency` 0.2

`round: n=0` (half away from zero) · `floor` · `ceil` · `abs` ·
`percent` (`0.34` → `34%`)

`currency: code` (locale-aware) lands with the datetime filters; the host can
`registerFilter` its own now.

## Datetime — **0.2**

| Filter | Returns | Example |
|---|---|---|
| `date: fmt` | string | `{{user.created_at \| date: "MMM D, YYYY"}}` |
| `days_ago` | number | `{{if user.last_active \| days_ago > 30}}` |
| `days_until` | number | `{{if subscription.renews_at \| days_until <= 7}}` |
| `is_past` / `is_future` | boolean | `{{if trial.ends_at \| is_past}}` |

Datetime comparisons always go through a filter that returns a number/boolean —
authors never learn raw date-comparison semantics, and raw `>` on a date is a
lint error (`ML214`).

## Array — **shipped (0.2b/e)**

`count` → number · `join: sep` (default `", "`) → string · `first` / `last` →
item · `limit: n` → array · `pluck: "field"` → array ·
`where: "field", op, value` → filtered array · `sort: "field", "asc"|"desc"` →
sorted array · `sum` / `max` / `min: "field"?` → number.

Filters chain, and apply to a **loop source**:

```
{{for item in order.items | where: "status", "==", "unshipped" | sort: "price", "desc" | limit: 3}}
- {{item.title}} — {{item.price}}
{{/for}}
```

## See also

- [Variables](../variables.md) · [Loops](../loops.md) ·
  [`registerFilter`](../api.md#registerfilterdef)
