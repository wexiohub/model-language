# `null` vs `undefined` & `exists`

Both are "empty", but they tell different stories — and templates may distinguish
them.

- **`undefined`** — the data was never provided. *Real case:* the host doesn't
  sync `user.mrr` at all.
- **`null`** — the field is known and empty. *Real case:* `user.csm = null` means
  "no CSM assigned" (a fact), not "we don't know".

## Rules

| Check | `null` | `undefined` |
|---|---|---|
| `{{if user.csm exists}}` | ❌ false | ❌ false |
| `{{if user.csm == null}}` | ✅ true | ❌ false |
| `{{if user.csm == undefined}}` | ❌ false | ✅ true |

`exists` means "has a usable value" — false for **both** `null` and `undefined`.
That covers ~95% of "is it filled?" checks, so it's the one to reach for. The
explicit `== null` / `== undefined` checks remain for the 5% that genuinely care
which kind of empty it is.

## Interpolating an empty value

Interpolating `null`/`undefined` produces an empty string **and** a runtime
warning (`ML301`), unless a `| default` is applied.

```
your CSM {{user.csm.name}} will call you
```

If `user.csm` is `null` and there's no default, this renders "your CSM  will call
you" — broken. The linter pushes you to fix it:

```
your CSM {{user.csm.name | default: "our team"}} will call you
```

or guard it:

```
{{if user.csm exists}}your CSM {{user.csm.name}} will call you{{/if}}
```

## Safe navigation

Deep access through a `null`/`undefined` parent never throws:

- in a **condition** → the whole comparison is `false`;
- in an **interpolation** → empty string + warning (unless `| default`).

Short-circuit guards work — the right side is skipped when the left is false:

```
{{if user.csm exists and user.csm.name startsWith "A"}} … {{/if}}
```

Optional-chaining syntax `user.csm?.name` is accepted and equivalent (plain dots
are already safe; `?.` is just readability sugar).
