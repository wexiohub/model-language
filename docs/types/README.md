# Types

Users never declare types — the **schema** does, once. Every variable available in
a template is a `FieldDef` in the `FieldSchema` the host supplies. The editor uses
it for autocomplete and validation; the renderer uses it for correct coercion.

## The type set

| Type | Literals in templates | Notes |
|---|---|---|
| `string` | `"text"`, `'text'` | both quote styles |
| `number` | `42`, `3.14`, `-5` | one numeric type (float64) — no int/float split |
| `boolean` | `true`, `false` | lowercase only |
| `datetime` | — | compared via [filters](../filters/README.md) (`days_ago`, `is_past`), never raw `>` |
| `array` | `["a", "b"]` (in conditions) | homogeneous per schema `items` |
| `enum` | compared vs string literals | closed set from `values` |
| `multiEnum` | — | **array of enum values** (multi-select); use `contains`, not `==` |
| `object` | — | accessed via dot paths only |
| `dynamic` | — | custom fields typed at runtime; limited numeric coercion |
| `null` / `undefined` | `null`, `undefined` | see [null vs undefined](./null-vs-undefined.md) |

## `enum` vs `multiEnum`

- `enum` holds **one** value from `values`. Compare with `==`:
  `{{if user.plan == "pro"}}`.
- `multiEnum` holds **several** values (a multi-select). Compare with `contains`:
  `{{if user.lead_status contains "qualified"}}`. Using `==` on a `multiEnum` is
  the #1 mistake — the engine flags it (`ML220`) with a one-click fix to `contains`.

Values are validated against `values`: a typo like `contains "quallified"` is an
edit-time error (`ML202`) with autocomplete from the declared set.

## Coercion — strict, with two humane exceptions

No implicit coercion in comparisons. `user.mrr == "500"` (number vs string) is an
edit-time error (`ML201`) and evaluates to `false` at runtime — never a crash.

Exceptions:
1. **Interpolation stringifies everything.** `{{user.mrr}}` → `"500"`,
   `{{user.tags}}` → `"beta, vip"`, datetime → ISO 8601. Objects do not stringify
   (warning `ML302`, renders empty).
2. **Numeric strings in `dynamic` fields.** `user.custom.score > 10` parses
   `"15"` as `15`; unparseable → `false` + warning.

## Operator × type matrix

| Operator | string | number | boolean | array | enum | multiEnum | datetime | null/undef |
|---|---|---|---|---|---|---|---|---|
| `==` `!=` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ (use `contains`) | ❌ (filters) | ✅ vs null/undefined |
| `>` `<` `>=` `<=` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ (filters) | ❌ |
| `contains` | ✅ substring | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `contains_any` / `contains_all` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `in [..]` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `startsWith` `endsWith` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `matches` (regex) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `is_empty` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `exists` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | n/a |

Any ❌ combination is an edit-time lint error and evaluates to `false` at
runtime — it never throws.

## Truthiness (for bare `{{if expr}}`)

Falsy: `""`, `0`, `false`, `null`, `undefined`, `[]` (empty array). Everything
else is truthy — including `"false"` and `"0"` as non-empty strings. So
`{{if user.tags}}` reads naturally as "if the contact has any tags".

## See also

- [`null` vs `undefined` & `exists`](./null-vs-undefined.md)
- [Filters](../filters/README.md) · [Conditionals](../conditionals.md)
