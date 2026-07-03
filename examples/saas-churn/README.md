# saas-churn — input → output

> **Renders today (0.1b)** — `and`, `in`, `==`, `>`, nested `if`, the `default`
> filter, whitespace hygiene. (`last_active_days` here is plain data; a real
> template would derive it with `| days_ago` in 0.2.)

## Input — [`saas-churn.mlt`](./saas-churn.mlt)

```
{{if user.churn_risk == "high" and user.plan in ["pro", "team"]}}
Retention mode. This account is at risk (last active {{user.last_active_days | default: "unknown"}} days ago).

1. Solve their current question first — flawlessly.
2. If they mention canceling, do not argue. Ask one open question about what's missing, then offer a call with {{user.csm_name | default: "our team"}}.
3. Never offer discounts unprompted.
{{if user.mrr > 300}}
If they explicitly push on price, you may offer up to 20% for 3 months.
{{/if}}
{{else}}
Standard support. Be helpful and concise.
{{/if}}
```

## Data snapshot

```json
{
  "user": {
    "churn_risk": "high",
    "plan": "pro",
    "last_active_days": 31,
    "csm_name": null,
    "mrr": 450
  }
}
```

## Output

High risk + a paid plan → retention branch; `mrr` (450) > 300 → the pricing line
is included; `csm_name` is null → falls back to "our team":

```
Retention mode. This account is at risk (last active 31 days ago).

1. Solve their current question first — flawlessly.
2. If they mention canceling, do not argue. Ask one open question about what's missing, then offer a call with our team.
3. Never offer discounts unprompted.
If they explicitly push on price, you may offer up to 20% for 3 months.
```

Set `churn_risk` to anything else (or a non-paid plan) → the whole output becomes
`Standard support. Be helpful and concise.`
