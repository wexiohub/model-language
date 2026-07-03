# billing-escalation — input → output

> Renders fully from **0.2** — needs conditionals (0.1b), the `#priority`
> directive, and arithmetic `14 - …` (0.2). Output below is the target result.

## Input — [`billing-escalation.mlt`](./billing-escalation.mlt)

```
{{if subscription exists and subscription.status == "past_due"}}
{{#priority high}}
Payment issue: {{subscription.days_past_due}} days overdue.
Guide them to update the card: {{org.billing_portal_url}}.
{{if subscription.days_past_due > 7}}
Warn access is suspended in {{14 - subscription.days_past_due}} days.
{{/if}}
{{/priority}}
{{/if}}
```

## Data snapshot

```json
{
  "subscription": { "status": "past_due", "days_past_due": 9 },
  "org": { "billing_portal_url": "https://acme.co/billing" }
}
```

## Output

Block-only and directive-only lines are dropped by whitespace hygiene; the outer
`if` is true (`subscription` exists and is `past_due`), the inner `if` is true
(`9 > 7`), and `14 - 9 = 5`:

```
Payment issue: 9 days overdue.
Guide them to update the card: https://acme.co/billing.
Warn access is suspended in 5 days.
```

The `{{#priority high}}` wrapper doesn't render text — it routes this block to the
prompt's protected/high-priority section. With `subscription.days_past_due` of
`5` instead (`5 > 7` is false), the last line is omitted.
