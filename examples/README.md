# Examples

Real-world Model Language templates, organized by size. Each `.mlt` template has
a companion `.md` showing **input → data → output** concretely.

> These double as golden fixtures: as the engine lands (0.1a → 0.3), each becomes
> an executable test so the shown output can never drift from behavior.

## Run it — input → engine → output

```bash
pnpm example                              # inline demo (examples/basic.ts)
pnpm example:run examples/small/welcome.mlt   # render any .mlt file
```

`pnpm example` prints:

```
--- input ---
Hi {{user.name | default: "there"}}! You have {{user.tags}} tags.
--- output ---
Hi there! You have beta, vip tags.
```

## `small/` — focused, one idea each

| Template | Shows | Renders |
|---|---|---|
| [welcome](./small/welcome.mlt) · [output](./small/welcome.md) | interpolation + `default` | 0.1a ✅ |
| [plan-badge](./small/plan-badge.mlt) · [output](./small/plan-badge.md) | `if/elseif/else` + `==` | 0.1b ✅ |
| [verified-note](./small/verified-note.mlt) · [output](./small/verified-note.md) | `contains` on an array | 0.1b ✅ |
| [greeting](./small/greeting.mlt) · [output](./small/greeting.md) | interpolation + a date condition | 0.1a / 0.2 |

## `large/` — realistic, multi-feature

| Template | Shows | Renders |
|---|---|---|
| [support-router](./large/support-router.mlt) · [output](./large/support-router.md) | nested `if`, `and`/`or`, `contains`, whitespace hygiene | 0.1b ✅ |
| [billing-escalation](./large/billing-escalation.mlt) · [output](./large/billing-escalation.md) | conditions + `#priority` + arithmetic | 0.2 |
| [order-status](./large/order-status.mlt) · [output](./large/order-status.md) | existence + `for` loop + `date` | 0.2 |
| [lead-qualification](./large/lead-qualification.mlt) · [output](./large/lead-qualification.md) | `multiEnum` `contains`/`is_empty` + `elseif` | 0.2 |

Rendering a template in code:

```ts
import { readFileSync } from 'node:fs';
import { parse, render } from '@wexio/model-language';

const source = readFileSync('examples/small/welcome.mlt', 'utf8');
const { text } = render(parse(source).ast, snapshot, schema);
```
