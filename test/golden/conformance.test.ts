import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type FieldSchema, parse, render } from '../../src/index';

interface ConformanceCase {
  name: string;
  template: string;
  schema: FieldSchema;
  data: Record<string, unknown>;
  expect: { output: string; warnings: string[] };
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
      const result = render(parse(c.template).ast, c.data, c.schema);
      expect(result.text).toBe(c.expect.output);
      expect(result.warnings.map((w) => w.code)).toEqual(c.expect.warnings);
    });
  }
});
