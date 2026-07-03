# Examples

Real-world templates, simplest → most complex. Each `.mlt` file is a Model
Language template; below, each has the **schema** and **data snapshot** it renders
against, plus the **expected output**.

Every template also has a companion `.md` showing **input → data → output**
concretely: [welcome.md](./welcome.md) · [greeting.md](./greeting.md) ·
[order-status.md](./order-status.md) · [billing-escalation.md](./billing-escalation.md) ·
[lead-qualification.md](./lead-qualification.md).

> These double as golden fixtures: as the engine lands (milestones 0.1 → 0.3),
> each example becomes an executable test asserting the output below — so the
> examples can never drift from behavior.

## Run it — input → engine → output

Two runnable demos ship today (0.1a renders interpolation + the `default`
filter):

```bash
pnpm example                       # inline demo (examples/basic.ts)
pnpm example:run examples/welcome.mlt   # render any .mlt file
```

`pnpm example` prints:

```
--- input ---
Hi {{user.name | default: "there"}}! You have {{user.tags}} tags.
--- output ---
Hi there! You have beta, vip tags.
```

[`welcome.mlt`](./welcome.mlt) (interpolation-only) renders fully now;
[`greeting.mlt`](./greeting.mlt) and the others below use conditionals/loops and
render fully from milestone 0.1b. In code:

```ts
import { readFileSync } from 'node:fs';
import { parse, render } from '@wexio/model-language';

const source = readFileSync('examples/welcome.mlt', 'utf8');
const { text } = render(parse(source).ast, snapshot, schema);
```

---

## [`greeting.mlt`](./greeting.mlt) — onboarding greeting

Filters + a date-based condition.

- **Schema:** `agent.name:string`, `org.name:string`, `user.name:string?`,
  `user.language:string?`, `user.created_at:datetime`.
- **Data:** `{ agent:{name:"Aria"}, org:{name:"Acme"}, user:{ name:null, language:null, created_at:"2026-07-01" } }` · now `2026-07-03`.
- **Output:**
  ```
  You are Aria, support for Acme.
  The user's name is there. Reply in English.

  The user signed up recently — proactively offer onboarding help.
  ```

---

## [`order-status.mlt`](./order-status.mlt) — e-commerce order

Namespace existence, a loop, an `else` empty-state.

- **Schema:** `order:object?`, `order.id:string`, `order.status:string`,
  `order.eta:datetime`, `order.items:array<object>`, `order.items[].title:string`,
  `order.items[].qty:number`.
- **Data (linked):** `{ order:{ id:"1042", status:"shipped", eta:"2026-07-05", items:[{title:"Hub",qty:1},{title:"Cable",qty:3}] } }`.
- **Output:**
  ```
  Order #1042 — shipped, ETA Jul 5.
  - Hub × 1
  - Cable × 3
  ```
- **Data (no order):** `{}` → `No recent order. Ask for the order number or the checkout email.`

---

## [`billing-escalation.mlt`](./billing-escalation.mlt) — past-due nudge

Nested conditions, a `#priority` directive, arithmetic.

- **Schema:** `subscription:object?`, `subscription.status:enum[trialing,active,past_due,canceled]`, `subscription.days_past_due:number`, `org.billing_portal_url:string`.
- **Data:** `{ subscription:{ status:"past_due", days_past_due:9 }, org:{ billing_portal_url:"https://acme.co/billing" } }`.
- **Output (high-priority section):**
  ```
  Payment issue: 9 days overdue.
  Guide them to update the card: https://acme.co/billing.
  Warn access is suspended in 5 days.
  ```

---

## [`lead-qualification.mlt`](./lead-qualification.mlt) — sales routing

`multiEnum` `contains` / `is_empty`, `elseif`, nested existence checks.

- **Schema:** `user.lead_status:multiEnum[new,qualified,lost]`,
  `user.interest_level:multiEnum[low,medium,high]`, `user.budget_range:string?`.
- **Data:** `{ user:{ lead_status:["new"], interest_level:[], budget_range:null } }`.
- **Output:**
  ```
  Discovery mode: learn budget and timeline. Don't pitch plans yet.
  Naturally ask about budget.
  ```
