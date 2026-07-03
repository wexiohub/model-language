import { describe, expect, it } from 'vitest';
import { getFilter } from '../../src/filters';

describe('default filter', () => {
  const def = getFilter('default');

  it('is registered as a built-in', () => {
    expect(def).toBeDefined();
  });

  it('returns the fallback for null / undefined / empty string', () => {
    expect(def?.apply(null, ['x'])).toBe('x');
    expect(def?.apply(undefined, ['x'])).toBe('x');
    expect(def?.apply('', ['x'])).toBe('x');
  });

  it('returns the input when present (including 0)', () => {
    expect(def?.apply('hi', ['x'])).toBe('hi');
    expect(def?.apply(0, ['x'])).toBe(0);
  });
});
