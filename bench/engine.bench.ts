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

const snippets = { header: '=== {{org.name}} ===', footer: 'Generated for {{user.name}}.' };

const schema: FieldSchema = [
  { path: 'user.name', type: 'string' },
  { path: 'user.plan', type: 'enum', values: ['free', 'pro', 'team'] },
  { path: 'user.mrr', type: 'number' },
  { path: 'order.items', type: 'array', items: 'object' },
];

const data = {
  org: { name: 'Acme' },
  user: { name: 'vasyl', plan: 'pro', mrr: 450, seats: 7, churn_risk: 'low' },
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

describe('parse (cold path)', () => {
  bench('small', () => void parse(small));
  bench('large', () => void parse(large));
  bench('huge', () => void parse(huge));
});

describe('render (hot path — pre-parsed AST)', () => {
  bench('small', () => void render(smallAst, data, schema));
  bench('large', () => void render(largeAst, data, schema));
  bench('huge', () => void render(hugeAst, data, schema, { snippets }));
});

describe('validate (editor path)', () => {
  bench('large', () => void validate(large, schema));
  bench('huge', () => void validate(huge, schema));
});
