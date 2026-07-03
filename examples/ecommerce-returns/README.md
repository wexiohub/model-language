# ecommerce-returns — input → output

> **Renders today (0.1b)** — `>`, `or`, `>=`, `<`, `and`, `elseif` chain, the
> `default` filter. A four-way segmentation from a single set of signals.

## Input — [`ecommerce-returns.mlt`](./ecommerce-returns.mlt)

```
{{if user.fraud_score > 0.7 or user.has_active_dispute}}
Do not process any return or refund. Do not explain why. Escalate to the disputes team immediately.
{{elseif user.orders_count >= 5 and user.return_rate < 0.2}}
Loyal customer. Offer an instant refund without waiting for the item to arrive back, plus a goodwill code for next time.
{{elseif user.return_rate >= 0.5}}
High return rate. Standard policy only, no exceptions. Do not offer goodwill credits.
{{else}}
Standard flow: 30-day window, prepaid label via {{org.returns_url | default: "the returns portal"}}.
{{/if}}
```

## Data → Output

| Signals | Branch → Output |
|---|---|
| `fraud_score: 0.9` | `Do not process any return or refund. …` |
| `orders_count: 8, return_rate: 0.1` | `Loyal customer. Offer an instant refund …` |
| `return_rate: 0.6` | `High return rate. Standard policy only …` |
| `orders_count: 1, return_rate: 0.1` (+ `org.returns_url: "https://acme.co/returns"`) | `Standard flow: 30-day window, prepaid label via https://acme.co/returns.` |

The first matching branch wins; a missing `org.returns_url` falls back to
"the returns portal".
