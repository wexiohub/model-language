# greeting — input → output

> Interpolation, the `{{if …}}` block, and the `days_ago` filter.

## Input — [`greeting.mlt`](./greeting.mlt)

```
You are {{agent.name}}, support for {{org.name}}.
The user's name is {{user.name | default: "there"}}. Reply in {{user.language | default: "English"}}.

{{if user.created_at | days_ago < 14}}
The user signed up recently — proactively offer onboarding help.
{{/if}}
```

## Data snapshot

```json
{
  "agent": { "name": "Aria" },
  "org": { "name": "Acme" },
  "user": { "name": null, "language": null, "created_at": "2026-06-28" }
}
```

("now" = 2026-07-03, so `created_at` is 5 days ago → `days_ago < 14` is true.)

## Output

The block-only tag lines are dropped; the `if` is true:

```
You are Aria, support for Acme.
The user's name is there. Reply in English.

The user signed up recently — proactively offer onboarding help.
```

If `created_at` were older than 14 days, the last paragraph (and its blank line)
would be omitted.
