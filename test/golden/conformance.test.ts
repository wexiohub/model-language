import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type FieldSchema, parse, render, validate } from '../../src/index';

interface ConformanceCase {
  name: string;
  template: string;
  schema: FieldSchema;
  data?: Record<string, unknown>;
  now?: number;
  snippets?: Record<string, string>;
  expect: { output?: string; warnings?: string[]; diagnostics?: string[] };
}

const dir = fileURLToPath(new URL('../../conformance/cases', import.meta.url));
const cases: ConformanceCase[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as ConformanceCase);

describe('conformance suite (language-neutral fixtures)', () => {
  it('loads fixtures from conformance/cases', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const c of cases) {
    it(c.name, () => {
      if (c.expect.output !== undefined) {
        const opts = { now: c.now, snippets: c.snippets };
        const result = render(parse(c.template).ast, c.data ?? {}, c.schema, opts);
        expect(result.text).toBe(c.expect.output);
        expect(result.warnings.map((w) => w.code)).toEqual(c.expect.warnings ?? []);
      }
      if (c.expect.diagnostics !== undefined) {
        const diagnostics = validate(c.template, c.schema).diagnostics.map((d) => d.code);
        expect(diagnostics.sort()).toEqual([...c.expect.diagnostics].sort());
      }
    });
  }
});
