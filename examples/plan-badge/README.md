# plan-badge — input → output

> **Renders today (0.1b)** — `if/elseif/else` + `==`.

## Input — [`plan-badge.mlt`](./plan-badge.mlt)

```
{{if user.plan == "pro"}}⭐ Pro member — priority support.{{elseif user.plan == "team"}}👥 Team plan.{{else}}Free plan — mention the upgrade only if they ask.{{/if}}
```

## Data → Output

| `user.plan` | Output |
|---|---|
| `"pro"` | `⭐ Pro member — priority support.` |
| `"team"` | `👥 Team plan.` |
| `"free"` (or anything else) | `Free plan — mention the upgrade only if they ask.` |

Try it: `pnpm example:run examples/plan-badge/plan-badge.mlt` (defaults `user.plan` unset → the `else` branch).
