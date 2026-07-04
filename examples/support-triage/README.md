# support-triage — input → output

> **Renders** — three independent `if` blocks composing a prompt
> from `contains` (multi-select) + `==` (category), with whitespace hygiene.

## Input — [`support-triage.mlt`](./support-triage.mlt)

```
{{if user.priority contains "urgent"}}
Acknowledge the urgency in your first sentence. No upsell. Escalate after one failed resolution attempt.
{{/if}}
{{if user.category == "billing"}}
Billing topic — verify the account email on file before discussing any charges.
{{elseif user.category == "technical"}}
Technical topic — ask for the exact error message and the steps to reproduce.
{{elseif user.category == "sales"}}
Sales topic — qualify budget and timeline before proposing a plan.
{{/if}}
{{if user.chat_status contains "waiting_reply"}}
The user has been waiting for a reply. Open with a brief apology for the delay.
{{/if}}
```

## Data snapshot

```json
{
  "user": {
    "priority": ["urgent"],
    "category": "technical",
    "chat_status": ["open", "waiting_reply"]
  }
}
```

## Output

All three blocks fire (urgent priority, technical category, waiting status);
block-only lines are dropped:

```
Acknowledge the urgency in your first sentence. No upsell. Escalate after one failed resolution attempt.
Technical topic — ask for the exact error message and the steps to reproduce.
The user has been waiting for a reply. Open with a brief apology for the delay.
```
