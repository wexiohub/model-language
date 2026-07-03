# lead-qualification — input → output

> Renders fully from **0.2** — needs conditionals (0.1b) and the `multiEnum`
> operators `contains` / `is_empty` (0.2).

## Input — [`lead-qualification.mlt`](./lead-qualification.mlt)

```
{{if user.lead_status contains "new" and user.interest_level is_empty}}
Discovery mode: learn budget and timeline. Don't pitch plans yet.
{{if not user.budget_range exists}}Naturally ask about budget.{{/if}}
{{elseif user.lead_status contains "qualified" and user.interest_level contains "high"}}
Hot lead. Budget: {{user.budget_range | default: "not stated"}}. Move toward a demo.
{{/if}}
```

## Data snapshot

```json
{
  "user": { "lead_status": ["new"], "interest_level": [], "budget_range": null }
}
```

## Output

`lead_status` contains `"new"` and `interest_level` is empty → the first branch
fires; `budget_range` doesn't exist → the nested prompt is added:

```
Discovery mode: learn budget and timeline. Don't pitch plans yet.
Naturally ask about budget.
```

A `qualified` + `high` lead would instead render the `elseif` branch.
