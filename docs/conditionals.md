# Conditionals

**Milestone 0.1.**

Include text only when a condition holds.

```
{{if user.plan == "pro"}}
Priority support is on.
{{elseif user.plan == "team"}}
Team support is on.
{{else}}
You're on the free plan.
{{/if}}
```

Unlimited `elseif`, optional single `else`, arbitrary nesting. An unclosed block
is a parse error (`ML001`) pointing at the **opening** tag — where the mistake is.

## Operators

Comparison: `== != < > >= <=`, `in [..]`, `contains`, `contains_any`,
`contains_all`, `is_empty`, `startsWith`, `endsWith`, `matches`, `exists`. Which
operators are legal depends on the operand type — see the
[operator × type matrix](./types/README.md#operator--type-matrix). An illegal
combination is an edit-time error and evaluates to `false` at runtime.

Operands may be field paths, literals, or field-vs-field:

```
{{if order.total > user.credit_limit}} … {{/if}}
```

## Logical operators & precedence

`not` binds tightest, then `and`, then `or`; parentheses override. Comparisons
bind tighter than logical operators.

```
{{if (user.plan == "enterprise" or user.mrr > 500) and not user.has_active_dispute}}
```

**Short-circuit is guaranteed** — a false left side skips the right, so guards are
safe:

```
{{if user.csm exists and user.csm.name startsWith "A"}} … {{/if}}
```

## Truthiness

A bare `{{if expr}}` uses truthiness: `""`, `0`, `false`, `null`, `undefined`, and
`[]` are falsy; everything else is truthy. So `{{if user.tags}}` means "if the
contact has any tags", and `{{if not user.is_blocked}}` reads naturally.

## Existence

`exists` is the null-safe "is it filled?" check — false for both `null` and
`undefined`. See [`null` vs `undefined`](./types/null-vs-undefined.md).

```
{{if subscription exists}}
Plan: {{subscription.plan_name}}.
{{else}}
No billing account linked yet.
{{/if}}
```

## Multi-select (`multiEnum`) conditions

```
{{if user.priority contains "urgent"}} … {{/if}}
{{if user.priority contains_any ["urgent", "high"]}} … {{/if}}
{{if user.chat_status contains "resolved" and user.lead_status is_empty}} … {{/if}}
```

Use `contains`, never `==`, on a multi-select field — the engine rewrites `==` to
`contains` via the `ML220` quickfix.

## Common pitfalls the linter catches

- `{{if user.plan == "premium"}}` when the enum has no `"premium"` → `ML202`
  (branch would silently never fire — the #1 "AI ignores my rules" bug).
- `{{if user.mrr == "500"}}` (number vs string) → `ML201`.
- `{{if user.created_at > "2024-01-01"}}` (raw date compare) → `ML214`; use
  `{{if user.created_at | days_ago > 365}}` instead.

## See also

- [Types & operators](./types/README.md) · [Loops](./loops.md) ·
  [Diagnostics](./diagnostics.md)
