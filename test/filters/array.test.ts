import { describe, expect, it } from 'vitest';
import { getFilter } from '../../src/filters';

const apply = (name: string, input: unknown, args: unknown[] = []) => {
  const def = getFilter(name);
  if (!def) throw new Error(`no filter ${name}`);
  return def.apply(input, args);
};

describe('array filters', () => {
  it('count', () => {
    expect(apply('count', ['a', 'b'])).toBe(2);
    expect(apply('count', 5)).toBe(5);
  });

  it('join (custom + default separator)', () => {
    expect(apply('join', ['a', 'b'], [' / '])).toBe('a / b');
    expect(apply('join', [1, 2])).toBe('1, 2');
    expect(apply('join', 5)).toBe(5);
  });

  it('first / last', () => {
    expect(apply('first', ['a', 'b'])).toBe('a');
    expect(apply('last', ['a', 'b'])).toBe('b');
    expect(apply('first', 5)).toBe(5);
    expect(apply('last', 5)).toBe(5);
  });

  it('limit', () => {
    expect(apply('limit', ['a', 'b', 'c'], [2])).toEqual(['a', 'b']);
    expect(apply('limit', 5, [2])).toBe(5);
    expect(apply('limit', ['a'], [])).toEqual(['a']);
  });

  it('pluck (objects + non-objects + passthrough)', () => {
    expect(apply('pluck', [{ id: 1 }, { id: 2 }, null], ['id'])).toEqual([1, 2, undefined]);
    expect(apply('pluck', 5, ['id'])).toBe(5);
    expect(apply('pluck', [{ id: 1 }], [])).toEqual([{ id: 1 }]);
  });
});
