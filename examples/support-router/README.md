# support-router — input → output

> **Renders** — nested `if/elseif/else`, `and`/`or`, `==`,
> `contains` (arrays), the `default` filter, and whitespace hygiene. A realistic
> "assemble the system prompt from context" template.

## Input — [`support-router.mlt`](./support-router.mlt)

```
{{if user.is_blocked}}
Do not engage. Reply once that the organization is unavailable, then stop.
{{else}}
You are {{agent.name}}, support for {{org.name}}. Reply in {{user.language | default: "English"}}.

{{if user.priority contains "urgent"}}
Acknowledge the urgency in your first sentence. No upsell.
{{/if}}

{{if user.channel == "whatsapp" or user.channel == "telegram"}}
Keep replies short and conversational — this is a messenger chat, not email.
{{/if}}

{{if user.lead_status contains "qualified"}}
This is a qualified lead. Move toward a demo booking when it fits.
{{elseif user.lead_status contains "lost"}}
Past lost lead — be helpful, don't push sales.
{{/if}}
{{/if}}
```

## Data snapshot

```json
{
  "agent": { "name": "Aria" },
  "org": { "name": "Acme" },
  "user": {
    "is_blocked": false,
    "language": null,
    "priority": ["urgent"],
    "channel": "whatsapp",
    "lead_status": ["qualified"]
  }
}
```

## Output

Not blocked → the `else` branch; `priority` contains `urgent`; `channel` is
`whatsapp`; `lead_status` contains `qualified`. Block-only lines are dropped and
blank runs collapsed:

```
You are Aria, support for Acme. Reply in English.

Acknowledge the urgency in your first sentence. No upsell.

Keep replies short and conversational — this is a messenger chat, not email.

This is a qualified lead. Move toward a demo booking when it fits.
```

Flip `is_blocked` to `true` and the entire output becomes the single "do not
engage" line.
