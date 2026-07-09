# Examples

Real-world Model Language templates. **Each example lives in its own folder** with
the `.mlt` template and a `README.md` showing **input → data → output** concretely.

> These double as golden fixtures: each is an executable test, so the shown
> output can never drift from behavior.

## Run it — input → engine → output

```bash
pnpm example                              # inline demo (examples/basic.ts)
pnpm example:run examples/welcome/welcome.mlt   # render any .mlt file
```

`pnpm example` prints:

```
--- input ---
Hi {{user.name | default: "there"}}! You have {{user.tags}} tags.
--- output ---
Hi there! You have beta, vip tags.
```

## Catalogue

| Example | Shows |
|---|---|
| [welcome](./welcome/) | interpolation + `default` |
| [plan-badge](./plan-badge/) | `if/elseif/else` + `==` |
| [verified-note](./verified-note/) | `contains` on an array |
| [support-router](./support-router/) | nested `if`, `and`/`or`, `contains`, whitespace hygiene |
| [saas-churn](./saas-churn/) | SaaS retention — `and`/`in`/`>`, nested `if`, `default` |
| [ecommerce-returns](./ecommerce-returns/) | four-way segmentation — `>`/`or`/`>=`/`<`, `elseif` chain |
| [role-scoping](./role-scoping/) | data-platform RBAC — role `==`, `exists`, array |
| [support-triage](./support-triage/) | prompt assembled from 3 independent `if` blocks |
| [appointment-reminder](./appointment-reminder/) | scheduling — namespace `exists`, `not`, nested `if` |
| [greeting](./greeting/) | interpolation + a date condition |
| [billing-escalation](./billing-escalation/) | conditions + `#priority` + arithmetic |
| [order-status](./order-status/) | existence + `for` loop + `date` |
| [lead-qualification](./lead-qualification/) | `multiEnum` `contains`/`is_empty` + `elseif` |
| [verified-booking](./verified-booking/) | inline directives — `verify_before`, `identity` `==`, `assignedToRoles`, conditional `assignedToMaxCount` |

Rendering a template in code:

```ts
import { readFileSync } from 'node:fs';
import { parse, render } from 'model-language';

const source = readFileSync('examples/welcome/welcome.mlt', 'utf8');
const { text } = render(parse(source).ast, snapshot, schema);
```
