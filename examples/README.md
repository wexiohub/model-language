# Examples

Real-world Model Language templates. **Each example lives in its own folder** with
the `.mlt` template and a `README.md` showing **input → data → output** concretely.

> These double as golden fixtures: as the engine lands (0.1a → 0.3), each becomes
> an executable test so the shown output can never drift from behavior.

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

| Example | Shows | Renders |
|---|---|---|
| [welcome](./welcome/) | interpolation + `default` | 0.1a ✅ |
| [plan-badge](./plan-badge/) | `if/elseif/else` + `==` | 0.1b ✅ |
| [verified-note](./verified-note/) | `contains` on an array | 0.1b ✅ |
| [support-router](./support-router/) | nested `if`, `and`/`or`, `contains`, whitespace hygiene | 0.1b ✅ |
| [saas-churn](./saas-churn/) | SaaS retention — `and`/`in`/`>`, nested `if`, `default` | 0.1b ✅ |
| [ecommerce-returns](./ecommerce-returns/) | four-way segmentation — `>`/`or`/`>=`/`<`, `elseif` chain | 0.1b ✅ |
| [role-scoping](./role-scoping/) | data-platform RBAC — role `==`, `exists`, array | 0.1b ✅ |
| [support-triage](./support-triage/) | prompt assembled from 3 independent `if` blocks | 0.1b ✅ |
| [appointment-reminder](./appointment-reminder/) | scheduling — namespace `exists`, `not`, nested `if` | 0.1b ✅ |
| [greeting](./greeting/) | interpolation + a date condition | 0.1a / 0.2 |
| [billing-escalation](./billing-escalation/) | conditions + `#priority` + arithmetic | 0.2 |
| [order-status](./order-status/) | existence + `for` loop + `date` | 0.2 |
| [lead-qualification](./lead-qualification/) | `multiEnum` `contains`/`is_empty` + `elseif` | 0.2 |

Rendering a template in code:

```ts
import { readFileSync } from 'node:fs';
import { parse, render } from 'model-language';

const source = readFileSync('examples/welcome/welcome.mlt', 'utf8');
const { text } = render(parse(source).ast, snapshot, schema);
```
