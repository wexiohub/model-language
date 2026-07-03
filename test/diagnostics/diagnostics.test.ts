import { describe, expect, it } from 'vitest';
import { DIAGNOSTIC_CODES, makeDiagnostic, rangeAt } from '../../src/diagnostics';

describe('rangeAt', () => {
  it('builds a 1-based, end-exclusive range', () => {
    expect(rangeAt(1, 2, 1, 5)).toEqual({
      startLine: 1,
      startColumn: 2,
      endLine: 1,
      endColumn: 5,
    });
  });
});

describe('makeDiagnostic', () => {
  it('applies the catalog severity for the code', () => {
    const d = makeDiagnostic('ML220', 'use contains', rangeAt(3, 1, 3, 3));
    expect(d).toEqual({
      code: 'ML220',
      severity: 'error',
      message: 'use contains',
      range: { startLine: 3, startColumn: 1, endLine: 3, endColumn: 3 },
    });
  });

  it('merges optional fieldPath + quickfixes when provided', () => {
    const d = makeDiagnostic('ML301', 'empty', rangeAt(1, 1, 1, 2), {
      fieldPath: 'user.csm.name',
      quickfixes: [{ title: 'add default', edits: [] }],
    });
    expect(d.severity).toBe('warning');
    expect(d.fieldPath).toBe('user.csm.name');
    expect(d.quickfixes).toHaveLength(1);
  });
});

describe('DIAGNOSTIC_CODES', () => {
  it('classifies parse/type codes as errors and render codes as warnings', () => {
    expect(DIAGNOSTIC_CODES.ML001).toBe('error');
    expect(DIAGNOSTIC_CODES.ML220).toBe('error');
    expect(DIAGNOSTIC_CODES.ML306).toBe('warning');
    expect(DIAGNOSTIC_CODES.ML310).toBe('warning');
  });
});
