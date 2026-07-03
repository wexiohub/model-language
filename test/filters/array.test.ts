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

describe('array aggregation filters', () => {
  const items = [
    { name: 'Hub', price: 89, status: 'unshipped' },
    { name: 'Cable', price: 12, status: 'shipped' },
    { name: 'Dock', price: 45, status: 'unshipped' },
  ];

  it('where filters by a field condition', () => {
    expect(apply('where', items, ['status', '==', 'unshipped'])).toEqual([items[0], items[2]]);
    expect(apply('where', 5, ['status', '==', 'x'])).toBe(5);
    expect(apply('where', items, ['status'])).toBe(items);
    expect(apply('where', items, [])).toBe(items);
  });

  it('sort orders by a field (asc default, desc)', () => {
    expect(apply('sort', items, ['price'])).toEqual([items[1], items[2], items[0]]);
    expect(apply('sort', items, ['price', 'desc'])).toEqual([items[0], items[2], items[1]]);
    expect(apply('sort', 5, ['price'])).toBe(5);
    expect(apply('sort', items, [])).toBe(items);
  });

  it('sort handles equal values and primitive arrays', () => {
    expect(apply('sort', [{ p: 1 }, { p: 1 }], ['p'])).toEqual([{ p: 1 }, { p: 1 }]);
    expect(apply('sort', [3, 1, 2], ['x'])).toEqual([1, 2, 3]);
  });

  it('sum (field, primitives, non-number skipped, non-array)', () => {
    expect(apply('sum', items, ['price'])).toBe(146);
    expect(apply('sum', [1, 2, 'x', 3])).toBe(6);
    expect(apply('sum', 5)).toBe(5);
  });

  it('max / min', () => {
    expect(apply('max', items, ['price'])).toBe(89);
    expect(apply('min', items, ['price'])).toBe(12);
    expect(apply('max', [3, 'x', 2])).toBe(3);
    expect(apply('max', [])).toBeUndefined();
    expect(apply('max', 5)).toBe(5);
  });
});
