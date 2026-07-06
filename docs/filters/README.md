# Filters

Typed pipeline functions applied with `|`:

```
{{value | filter: arg1, arg2 | nextFilter}}
```

Each filter declares a typed signature. Wrong input type → edit-time lint
(`ML203`); at runtime the value passes through unchanged with a warning — a filter
**never throws**. Hosts add their own with [`registerFilter`](../api.md#registerfilterdef).

## Universal — **shipped**

| Filter | Signature | Example |
|---|---|---|
| `default` | `T? → fallback:T → T` | `{{user.name \| default: "there"}}` — the null-safety workhorse; returns the fallback for `null` / `undefined` / empty string. The fallback may itself be a field: `default: org.default_language` |

## String — **shipped**

`capitalize` · `upper` · `lower` · `trim` · `truncate: n` (adds `…`) ·
`replace: from, to`

```
{{user.bio | trim | truncate: 80}}
```

## Number — **shipped**

`round: n=0` (half away from zero) · `floor` · `ceil` · `abs` ·
`percent` (`0.34` → `34%`) · `currency: code`
(`1234.5` + `"USD"` → `$1,234.50`; symbols for USD/EUR/GBP/JPY, otherwise the code
is prefixed; a host can `registerFilter` a locale-aware override).

## Datetime — **shipped**

Relative filters (`time_ago`, `days_ago`, `days_until`, `is_past`, `is_future`)
resolve against a reference **`now`** — pass it via
`render(ast, data, schema, { now })` (defaults to the wall clock; golden tests
pin it). Inputs may be an ISO string, epoch ms, or a `Date`.

| Filter | Returns | Example |
|---|---|---|
| `date: fmt[, tz]` | string | `{{ user.created_at \| date: "MMM D, YYYY" }}` → `Jul 5, 2026` |
| `time_ago` | string | `{{ user.last_active \| time_ago }}` → `3 days ago` |
| `days_ago` | number | `{{if user.last_active \| days_ago > 30}}` |
| `days_until` | number | `{{if subscription.renews_at \| days_until <= 7}}` |
| `is_past` / `is_future` | boolean | `{{if trial.ends_at \| is_past}}` |

### `date` — formatting

`arg0` is EITHER a **named preset** or a **token format string**; `arg1` is an
optional IANA timezone.

```
{{ system.now | date: "date" }}                    07/05/2026   (preset)
{{ system.now | date: "time" }}                    14:37
{{ system.now | date: "long" }}                    July 5, 2026
{{ system.now | date: "iso" }}                     2026-07-05T14:37:09.000Z
{{ system.now | date: "MMM D, YYYY" }}             Jul 5, 2026
{{ system.now | date: "h:mm A" }}                  2:37 PM
{{ system.now | date: "yyyy-MM-dd HH:mm" }}        2026-07-05 14:37
{{ system.now | date: "EEEE" }}                    Sunday
{{ system.now | date: "h:mm A", "Europe/Kyiv" }}   5:37 PM      (timezone)
{{ system.now | date: "[at] h:mm A" }}             at 2:37 PM   ([literal])
```

**Presets:** `date` · `time` · `datetime` · `long` · `weekday` · `month` · `iso`.

**Tokens** (both moment/Day.js and Unicode casing): year `YYYY`/`yyyy`
`YY`/`yy` · month `MMMM MMM MM M` · day `DD`/`dd` `D`/`d` · weekday
`dddd`/`EEEE` `ddd`/`EEE` · 24-hour `HH H` · 12-hour `hh h` · minute `mm m` ·
second `ss s` · `A`/`a` (AM/PM). Wrap literal letters in `[...]`.

**Timezone:** the IANA `arg1` applies when the host runtime has `Intl`
(Node/browsers); portable hosts without it (WASM) render **UTC**. Month/weekday
names are always English (never taken from ICU), so output is deterministic
across hosts — only the timezone *shift* depends on `Intl`.

Datetime comparisons always go through a filter that returns a number/boolean —
authors never learn raw date-comparison semantics, and raw `>` on a date is a
lint error (`ML214`).

## Array — **shipped**

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
