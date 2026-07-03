import { bench, describe } from 'vitest';
import { type FieldSchema, parse, render, validate } from '../src/index';

// Demonstrates the load-bearing perf property: parse once (cold), render many
// (hot). Run with `pnpm bench`.

const small = 'Hi {{ user.name | default: "there" }}! You are on {{ user.plan }}.';

const large = `{{if user.plan == "pro" and user.mrr > 100}}
Priority support for {{ user.name | capitalize }} ({{ user.mrr | currency: "USD" }} MRR).
{{for item in order.items | where: "status", "==", "open" | sort: "price", "desc" | limit: 5}}
- {{item.title}} — {{ item.price | currency: "USD" }} (#{{loop.index}} of {{loop.count}})
{{/for}}
Open total: {{ order.items | where: "status", "==", "open" | sum: "price" | currency: "USD" }}.
{{else}}
Standard support for {{ user.name | default: "there" }}.
{{/if}}`;

// A deliberately extreme template: nested loops, a complex boolean condition,
// where→sort→limit pipelines, arithmetic, currency, nested if/elseif/else inside
// an inner loop, a for-else, two includes, and a directive.
const huge = `{{include "header"}}
{{#priority high}}
{{if user.plan in ["pro", "team"] and user.mrr > 100 and not user.churn_risk == "high"}}
Account: {{ user.name | capitalize }} · {{ user.mrr | currency: "USD" }} MRR · seat cost {{ (user.mrr / user.seats) | round: 2 }}
{{for dept in departments}}
## {{ dept.name | upper }} ({{ dept.members | count }} people)
{{for m in dept.members | where: "active", "==", true | sort: "score", "desc" | limit: 3}}
- {{ m.name }} — {{ m.score }}{{if m.score > 90}} star{{elseif m.score > 70}} ok{{else}} low{{/if}} (#{{loop.index}}/{{loop.count}})
{{else}}
No active members in {{ dept.name }}.
{{/for}}
Total score: {{ dept.members | sum: "score" }}
{{/for}}
{{else}}
Standard tier for {{ user.name | default: "there" }}.
{{/if}}
{{/priority}}
{{include "footer"}}`;

// A source-size stress test: ~500 independent rule blocks (if/elseif/else with
// logical operators, arithmetic, filters, interpolation) → ~3,500 lines. This
// exercises the parser/typechecker on a production-scale prompt, whereas `huge`
// exercises the renderer on runtime-heavy nested loops. Both axes matter.
const XL_BLOCKS = 500;
const xl = Array.from({ length: XL_BLOCKS }, (_, i) => {
  const k = 50 + (i % 40) * 10;
  const k2 = 20 + (i % 30) * 5;
  return `{{if user.plan == "pro" and user.mrr > ${k} and not user.churn_risk == "high"}}
Rule ${i}: {{ user.name | capitalize }} qualifies — segment ${i}, seat spend {{ (user.mrr / user.seats) | round: 2 }}.
{{elseif user.mrr > ${k2} or user.tags contains "seg${i % 20}"}}
Rule ${i} partial for {{ user.name | default: "there" }} ({{ user.mrr | currency: "USD" }}).
{{else}}
Rule ${i} baseline tier.
{{/if}}`;
}).join('\n');

const xlSchema: FieldSchema = [
  { path: 'user.name', type: 'string' },
  { path: 'user.plan', type: 'enum', values: ['free', 'pro', 'team'] },
  { path: 'user.mrr', type: 'number' },
  { path: 'user.seats', type: 'number' },
  { path: 'user.churn_risk', type: 'enum', values: ['low', 'high'] },
  { path: 'user.tags', type: 'array', items: 'string' },
];

const snippets = { header: '=== {{org.name}} ===', footer: 'Generated for {{user.name}}.' };

const schema: FieldSchema = [
  { path: 'user.name', type: 'string' },
  { path: 'user.plan', type: 'enum', values: ['free', 'pro', 'team'] },
  { path: 'user.mrr', type: 'number' },
  { path: 'order.items', type: 'array', items: 'object' },
];

const data = {
  org: { name: 'Acme' },
  user: {
    name: 'vasyl',
    plan: 'pro',
    mrr: 450,
    seats: 7,
    churn_risk: 'low',
    tags: ['seg1', 'seg3', 'seg5'],
  },
  order: {
    items: Array.from({ length: 20 }, (_, i) => ({
      title: `Item ${i}`,
      price: (i * 7) % 100,
      status: i % 3 === 0 ? 'open' : 'shipped',
    })),
  },
  departments: Array.from({ length: 8 }, (_, d) => ({
    name: `Dept ${d}`,
    members: Array.from({ length: 12 }, (_, m) => ({
      name: `Member ${d}-${m}`,
      score: (m * 13 + d * 7) % 100,
      active: m % 2 === 0,
    })),
  })),
};

const smallAst = parse(small).ast;
const largeAst = parse(large).ast;
const hugeAst = parse(huge).ast;
const xlAst = parse(xl).ast;

describe('parse (cold path)', () => {
  bench('small', () => void parse(small));
  bench('large', () => void parse(large));
  bench('huge', () => void parse(huge));
  bench('xl (~3.5k lines)', () => void parse(xl));
});

describe('render (hot path — pre-parsed AST)', () => {
  bench('small', () => void render(smallAst, data, schema));
  bench('large', () => void render(largeAst, data, schema));
  bench('huge', () => void render(hugeAst, data, schema, { snippets }));
  bench('xl (~3.5k lines)', () => void render(xlAst, data, xlSchema));
});

describe('validate (editor path)', () => {
  bench('large', () => void validate(large, schema));
  bench('huge', () => void validate(huge, schema));
  bench('xl (~3.5k lines)', () => void validate(xl, xlSchema));
});
