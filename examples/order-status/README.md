# order-status — input → output

> Renders — needs conditionals + namespace existence,
> the `for` loop, and the `date` filter.

## Input — [`order-status.mlt`](./order-status.mlt)

```
{{if order exists}}
Order #{{order.id}} — {{order.status}}, ETA {{order.eta | date: "MMM D"}}.
{{for item in order.items}}
- {{item.title}} × {{item.qty}}
{{/for}}
{{else}}
No recent order. Ask for the order number or the checkout email.
{{/if}}
```

## Data snapshot — order linked

```json
{
  "order": {
    "id": "1042",
    "status": "shipped",
    "eta": "2026-07-05",
    "items": [{ "title": "Hub", "qty": 1 }, { "title": "Cable", "qty": 3 }]
  }
}
```

## Output — order linked

```
Order #1042 — shipped, ETA Jul 5.
- Hub × 1
- Cable × 3
```

## Output — no order (`{}`)

The `else` branch fires:

```
No recent order. Ask for the order number or the checkout email.
```
