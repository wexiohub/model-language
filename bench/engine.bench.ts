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

const schema: FieldSchema = [
  { path: 'user.name', type: 'string' },
  { path: 'user.plan', type: 'enum', values: ['free', 'pro', 'team'] },
  { path: 'user.mrr', type: 'number' },
  { path: 'order.items', type: 'array', items: 'object' },
];

const data = {
  user: { name: 'vasyl', plan: 'pro', mrr: 450 },
  order: {
    items: Array.from({ length: 20 }, (_, i) => ({
      title: `Item ${i}`,
      price: (i * 7) % 100,
      status: i % 3 === 0 ? 'open' : 'shipped',
    })),
  },
};

const smallAst = parse(small).ast;
const largeAst = parse(large).ast;

describe('parse (cold path)', () => {
  bench('small', () => void parse(small));
  bench('large', () => void parse(large));
});

describe('render (hot path — pre-parsed AST)', () => {
  bench('small', () => void render(smallAst, data, schema));
  bench('large', () => void render(largeAst, data, schema));
});

describe('validate (editor path)', () => {
  bench('large', () => void validate(large, schema));
});
