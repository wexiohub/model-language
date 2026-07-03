import { describe, expect, it } from 'vitest';
import { getFilter, listFilters, registerFilter } from '../src/filters';
import { allRules, registerRule } from '../src/rules';

describe('filter registry', () => {
  it('registers, resolves, and lists a filter', () => {
    const def = { name: 'shout', apply: (v: unknown) => String(v).toUpperCase() };
    registerFilter(def);
    expect(getFilter('shout')).toBe(def);
    expect(listFilters()).toContain('shout');
  });

  it('resolves an unknown filter to undefined', () => {
    expect(getFilter('does-not-exist')).toBeUndefined();
  });
});

describe('rule registry', () => {
  it('registers a rule and returns it via allRules', () => {
    const rule = { code: 'ML999', check: () => [] };
    registerRule(rule);
    expect(allRules()).toContain(rule);
  });
});
