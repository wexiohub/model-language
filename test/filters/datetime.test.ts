import { describe, expect, it } from 'vitest';
import { getFilter } from '../../src/filters';
import type { FilterContext } from '../../src/types';

const NOW = Date.UTC(2026, 6, 3); // 2026-07-03 UTC
const ctx: FilterContext = { now: NOW };

const apply = (name: string, input: unknown, args: unknown[] = [], c?: FilterContext) => {
  const def = getFilter(name);
  if (!def) throw new Error(`no filter ${name}`);
  return def.apply(input, args, c);
};

describe('date filter', () => {
  it('formats with tokens (UTC)', () => {
    expect(apply('date', '2026-07-05', ['YYYY-MM-DD'])).toBe('2026-07-05');
    expect(apply('date', '2026-07-05', ['MMM D'])).toBe('Jul 5');
    expect(apply('date', '2026-07-05', ['M'])).toBe('7');
  });

  it('accepts Date and epoch ms', () => {
    expect(apply('date', new Date(Date.UTC(2026, 0, 9)), ['MMM D'])).toBe('Jan 9');
    expect(apply('date', Date.UTC(2026, 11, 25), ['MMM D'])).toBe('Dec 25');
  });

  it('passes through invalid input / missing format', () => {
    expect(apply('date', 'not-a-date', ['YYYY'])).toBe('not-a-date');
    expect(apply('date', true, ['YYYY'])).toBe(true);
    expect(apply('date', '2026-07-05', [])).toBe('2026-07-05');
    const bad = new Date('invalid');
    expect(apply('date', bad, ['YYYY'])).toBe(bad);
  });
});

describe('relative datetime filters', () => {
  it('days_ago / days_until', () => {
    expect(apply('days_ago', '2026-06-03', [], ctx)).toBe(30);
    expect(apply('days_until', '2026-07-13', [], ctx)).toBe(10);
  });

  it('is_past / is_future', () => {
    expect(apply('is_past', '2026-07-01', [], ctx)).toBe(true);
    expect(apply('is_future', '2026-07-10', [], ctx)).toBe(true);
    expect(apply('is_past', '2026-07-10', [], ctx)).toBe(false);
    expect(apply('is_future', '2026-07-01', [], ctx)).toBe(false);
  });

  it('pass through without a context or on invalid input', () => {
    expect(apply('days_ago', '2026-07-01', [])).toBe('2026-07-01');
    expect(apply('days_until', '2026-07-01', [])).toBe('2026-07-01');
    expect(apply('is_past', '2026-07-01', [])).toBe('2026-07-01');
    expect(apply('is_future', '2026-07-01', [])).toBe('2026-07-01');
    expect(apply('days_ago', 'nope', [], ctx)).toBe('nope');
  });
});
