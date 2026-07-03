import { describe, expect, it } from 'vitest';
import { validate } from '../src/engine';

describe('validate', () => {
  it('parses + typechecks; clean text yields no diagnostics', () => {
    const result = validate('Hi {{user.name}}', [{ path: 'user.name', type: 'string' }]);
    expect(result.diagnostics).toEqual([]);
    expect(result.maxTokenEstimate).toBeGreaterThan(0);
    expect(result.ast.length).toBeGreaterThan(0);
  });
});

describe('validate — ML213 prompt budget', () => {
  const schema = [{ path: 'user.name', type: 'string' as const }];

  it('reports maxTokenEstimate but no ML213 when no budget is set', () => {
    const result = validate('Hi {{user.name}}', schema);
    expect(result.maxTokenEstimate).toBeGreaterThan(0);
    expect(result.diagnostics.map((d) => d.code)).not.toContain('ML213');
  });

  it('stays silent when the estimate fits the budget', () => {
    const result = validate('Hi {{user.name}}', schema, { maxTokenEstimate: 1000 });
    expect(result.diagnostics.map((d) => d.code)).not.toContain('ML213');
  });

  it('raises ML213 (warning) when the estimate exceeds the budget', () => {
    const result = validate('Hi {{user.name}}', schema, { maxTokenEstimate: 1 });
    const ml213 = result.diagnostics.find((d) => d.code === 'ML213');
    expect(ml213?.severity).toBe('warning');
    expect(ml213?.message).toContain('budget');
  });
});
