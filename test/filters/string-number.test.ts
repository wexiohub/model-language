import { describe, expect, it } from 'vitest';
import { getFilter } from '../../src/filters';

const apply = (name: string, input: unknown, args: unknown[] = []) => {
  const def = getFilter(name);
  if (!def) throw new Error(`no filter ${name}`);
  return def.apply(input, args);
};

describe('string filters', () => {
  it('upper / lower / trim / capitalize', () => {
    expect(apply('upper', 'aB')).toBe('AB');
    expect(apply('lower', 'aB')).toBe('ab');
    expect(apply('trim', '  x  ')).toBe('x');
    expect(apply('capitalize', 'vasyl')).toBe('Vasyl');
    expect(apply('capitalize', '')).toBe('');
  });

  it('pass non-strings through unchanged', () => {
    expect(apply('upper', 5)).toBe(5);
    expect(apply('lower', 5)).toBe(5);
    expect(apply('trim', 5)).toBe(5);
    expect(apply('capitalize', 5)).toBe(5);
  });

  it('truncate adds an ellipsis past the limit', () => {
    expect(apply('truncate', 'hello world', [5])).toBe('hello…');
    expect(apply('truncate', 'hi', [5])).toBe('hi');
    expect(apply('truncate', 5, [5])).toBe(5);
    expect(apply('truncate', 'hi', [])).toBe('hi');
  });

  it('replace swaps all occurrences', () => {
    expect(apply('replace', 'a-b-c', ['-', '/'])).toBe('a/b/c');
    expect(apply('replace', 5, ['-', '/'])).toBe(5);
    expect(apply('replace', 'x', ['-'])).toBe('x');
  });
});

describe('number filters', () => {
  it('round (half away from zero, optional digits)', () => {
    expect(apply('round', 2.5)).toBe(3);
    expect(apply('round', -2.5)).toBe(-3);
    expect(apply('round', 0)).toBe(0);
    expect(apply('round', 3.14159, [2])).toBe(3.14);
    expect(apply('round', 'x')).toBe('x');
  });

  it('floor / ceil / abs', () => {
    expect(apply('floor', 2.9)).toBe(2);
    expect(apply('ceil', 2.1)).toBe(3);
    expect(apply('abs', -4)).toBe(4);
    expect(apply('floor', 'x')).toBe('x');
    expect(apply('ceil', 'x')).toBe('x');
    expect(apply('abs', 'x')).toBe('x');
  });

  it('percent', () => {
    expect(apply('percent', 0.34)).toBe('34%');
    expect(apply('percent', 'x')).toBe('x');
  });
});
