# verified-note — input → output

> **Renders** — `contains` on an array. (Note: this branches
> *messaging* only; actual data-disclosure gating is enforced by the host, not
> the prompt.)

## Input — [`verified-note.mlt`](./verified-note.mlt)

```
{{if user.verified contains "EMAIL_OTP"}}Identity verified — normal support scope.{{else}}Unverified contact — verify identity before sharing account-specific details.{{/if}}
```

## Data → Output

| `user.verified` | Output |
|---|---|
| `["EMAIL_OTP"]` | `Identity verified — normal support scope.` |
| `[]` | `Unverified contact — verify identity before sharing account-specific details.` |
