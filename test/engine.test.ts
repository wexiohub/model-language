import { describe, expect, it } from 'vitest';
import { validate } from '../src/engine';

describe('validate', () => {
  it('parses + typechecks; clean text yields no diagnostics', () => {
    const result = validate('Hi {{user.name}}', [{ path: 'user.name', type: 'string' }]);
    expect(result.diagnostics).toEqual([]);
    expect(result.maxTokenEstimate).toBeNull();
    expect(result.ast.length).toBeGreaterThan(0);
  });
});
