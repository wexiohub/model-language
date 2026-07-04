# appointment-reminder — input → output

> **Renders** — namespace `exists`, `not`, boolean fields, nested
> `if`, the `default` filter, `if/else`.

## Input — [`appointment-reminder.mlt`](./appointment-reminder.mlt)

```
{{if booking exists}}
Reminder: your appointment with {{booking.provider | default: "our team"}} is confirmed.
{{if booking.needs_prep}}
Please complete the intake form before your visit.
{{/if}}
{{if not ctx.is_business_hours}}
We're currently closed — replies may be delayed until we reopen ({{org.business_hours | default: "business hours"}}).
{{/if}}
{{else}}
No upcoming appointment found for this contact. Offer to help them book one.
{{/if}}
```

## Data snapshot

```json
{
  "booking": { "provider": "Dr. Lee", "needs_prep": true },
  "ctx": { "is_business_hours": false },
  "org": { "business_hours": "Mon–Fri 9–5" }
}
```

## Output

`booking` exists → the reminder branch; `needs_prep` is true and it's outside
business hours → both nested notes are added:

```
Reminder: your appointment with Dr. Lee is confirmed.
Please complete the intake form before your visit.
We're currently closed — replies may be delayed until we reopen (Mon–Fri 9–5).
```

With no `booking` in the data, the output is the single "no upcoming appointment"
line instead.
