import { describe, expect, it } from 'vitest';
import {
  parse,
  registerFilter,
  registerRule,
  render,
  serialize,
  validate,
} from '../src/index';

describe('public API (barrel)', () => {
  it('round-trips plain text through parse → serialize → render', () => {
    const src = 'Hello, world';
    const { ast } = parse(src);
    expect(serialize(ast)).toBe(src);
    expect(render(ast, {}, []).text).toBe(src);
  });

  it('validate returns no diagnostics for clean text (scaffold)', () => {
    const result = validate('Hello', []);
    expect(result.diagnostics).toEqual([]);
    expect(result.maxTokenEstimate).toBeNull();
  });

  it('exposes registerFilter / registerRule (callable, never throw)', () => {
    expect(() => registerFilter({ name: 'noop', apply: (v) => v })).not.toThrow();
    expect(() => registerRule({ code: 'ML999', check: () => [] })).not.toThrow();
  });
});
