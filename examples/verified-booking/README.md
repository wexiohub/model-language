# verified-booking — input → output

> Showcases inline directives: `verify_before`, `identity` via `==`, `assignedToRoles`,
> plus a conditionally-fired `assignedToMaxCount` inside an `{{if}}` block.

## Input — [`verified-booking.mlt`](./verified-booking.mlt)

```
Help {{contact.first_name | default: "there"}} book a demo.

{{verify_before: payments}}
{{identity: contact.email == payments.email}}
{{assignedToRoles: [AGENT, EDITOR]}}

{{if contact.plan == "enterprise"}}
{{assignedToMaxCount: 3}}
Enterprise customer — keep the queue short.
{{/if}}
```

## Data snapshot

```json
{ "contact": { "first_name": "Vasyl", "plan": "enterprise" } }
```

## Output

Inline directive lines render to **nothing** in the text — they are stripped by the
engine. The `{{if}}` branch fires (plan is `"enterprise"`), so the conditional prose
appears. The `{{contact.first_name | default: "there"}}` interpolation resolves to
`"Vasyl"`:

```
Help Vasyl book a demo.

Enterprise customer — keep the queue short.
```

## Surfaced directives

Inline directives produce no text but are collected in `render().directives` for the
host to enforce. After rendering with the data snapshot above, `r.directives` is:

```json
[
  { "name": "verify_before",     "params": { "raw": "payments" } },
  { "name": "identity",          "params": { "raw": "contact.email == payments.email" } },
  { "name": "assignedToRoles",   "params": { "raw": "[AGENT, EDITOR]" } },
  { "name": "assignedToMaxCount","params": { "raw": "3" } }
]
```

Note conditional firing: with a non-`enterprise` plan the `{{if}}` branch is skipped,
so `assignedToMaxCount` would **not** appear in `directives` at all.
