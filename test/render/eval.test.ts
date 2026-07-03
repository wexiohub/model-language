import { describe, expect, it } from 'vitest';
import { parseCondition } from '../../src/parser/condition';
import { evalCondition, evalExpr, truthy } from '../../src/render/eval';
import type { Expr } from '../../src/types';

const ev = (src: string, snap: Record<string, unknown> = {}) => evalExpr(parseCondition(src), snap);
const cond = (src: string, snap: Record<string, unknown> = {}) =>
  evalCondition(parseCondition(src), snap);

describe('truthy', () => {
  it('falsy values', () => {
    for (const v of [null, undefined, '', 0, false, []]) expect(truthy(v)).toBe(false);
  });
  it('truthy values', () => {
    for (const v of ['x', 'false', 42, ['a'], {}]) expect(truthy(v)).toBe(true);
  });
});

describe('evalExpr — literals & paths', () => {
  it('resolves paths and literals', () => {
    expect(ev('user.name', { user: { name: 'v' } })).toBe('v');
    expect(ev('42')).toBe(42);
    expect(ev('user.missing', {})).toBeUndefined();
  });
});

describe('evalExpr — equality', () => {
  it('== / !=', () => {
    expect(ev('a == 1', { a: 1 })).toBe(true);
    expect(ev('a == 1', { a: 2 })).toBe(false);
    expect(ev('a != 1', { a: 2 })).toBe(true);
  });
});

describe('evalExpr — numeric comparisons', () => {
  it('< > <= >= with numbers', () => {
    expect(ev('a < 2', { a: 1 })).toBe(true);
    expect(ev('a < 2', { a: 3 })).toBe(false);
    expect(ev('a > 2', { a: 3 })).toBe(true);
    expect(ev('a <= 2', { a: 2 })).toBe(true);
    expect(ev('a >= 2', { a: 2 })).toBe(true);
  });
  it('returns false on type mismatch (never throws)', () => {
    expect(ev('a < 2', { a: 'x' })).toBe(false);
    expect(ev('a < b', { a: 1, b: 'x' })).toBe(false);
  });
});

describe('evalExpr — membership & strings', () => {
  it('in', () => {
    expect(ev('a in ["x", "y"]', { a: 'x' })).toBe(true);
    expect(ev('a in ["x", "y"]', { a: 'z' })).toBe(false);
    expect(ev('a in b', { a: 'x', b: 'notarray' })).toBe(false);
  });
  it('contains (array + string + mismatch)', () => {
    expect(ev('a contains "x"', { a: ['x', 'y'] })).toBe(true);
    expect(ev('a contains "z"', { a: ['x'] })).toBe(false);
    expect(ev('a contains "ell"', { a: 'hello' })).toBe(true);
    expect(ev('a contains "z"', { a: 5 })).toBe(false);
  });
  it('startsWith / endsWith', () => {
    expect(ev('a startsWith "he"', { a: 'hello' })).toBe(true);
    expect(ev('a endsWith "lo"', { a: 'hello' })).toBe(true);
    expect(ev('a startsWith "x"', { a: 5 })).toBe(false);
  });
  it('matches (valid, invalid regex, mismatch)', () => {
    expect(ev('a matches "^h"', { a: 'hi' })).toBe(true);
    expect(ev('a matches "("', { a: 'hi' })).toBe(false);
    expect(ev('a matches "x"', { a: 5 })).toBe(false);
  });
  it('exists', () => {
    expect(ev('a exists', { a: 'x' })).toBe(true);
    expect(ev('a exists', { a: null })).toBe(false);
    expect(ev('a exists', {})).toBe(false);
  });

  it('contains_any', () => {
    expect(ev('a contains_any ["x", "z"]', { a: ['x', 'y'] })).toBe(true);
    expect(ev('a contains_any ["z"]', { a: ['x'] })).toBe(false);
    expect(ev('a contains_any ["x"]', { a: 'notarray' })).toBe(false);
    expect(ev('a contains_any b', { a: ['x'], b: 5 })).toBe(false);
  });

  it('contains_all', () => {
    expect(ev('a contains_all ["x", "y"]', { a: ['x', 'y', 'z'] })).toBe(true);
    expect(ev('a contains_all ["x", "q"]', { a: ['x'] })).toBe(false);
    expect(ev('a contains_all ["x"]', { a: 'notarray' })).toBe(false);
    expect(ev('a contains_all b', { a: ['x'], b: 5 })).toBe(false);
  });

  it('is_empty (empty array, non-empty, or non-array)', () => {
    expect(ev('a is_empty', { a: [] })).toBe(true);
    expect(ev('a is_empty', { a: ['x'] })).toBe(false);
    expect(ev('a is_empty', {})).toBe(true);
  });
});

describe('evalExpr — logic', () => {
  it('and (short-circuit both ways)', () => {
    expect(ev('a and b', { a: true, b: true })).toBe(true);
    expect(ev('a and b', { a: false, b: true })).toBe(false);
  });
  it('or (short-circuit both ways)', () => {
    expect(ev('a or b', { a: false, b: true })).toBe(true);
    expect(ev('a or b', { a: true, b: false })).toBe(true);
  });
  it('not', () => {
    expect(ev('not a', { a: false })).toBe(true);
  });
});

describe('evalExpr — arithmetic', () => {
  it('computes + - * /', () => {
    expect(ev('a + 1', { a: 2 })).toBe(3);
    expect(ev('a - 1', { a: 2 })).toBe(1);
    expect(ev('a * 3', { a: 2 })).toBe(6);
    expect(ev('a / 2', { a: 6 })).toBe(3);
  });

  it('respects precedence and parentheses', () => {
    expect(ev('2 + 3 * 4')).toBe(14);
    expect(ev('(2 + 3) * 4')).toBe(20);
  });

  it('handles negative literals and unary minus', () => {
    expect(ev('-5 + 2')).toBe(-3);
    expect(ev('-a', { a: 3 })).toBe(-3);
    expect(ev('-')).toBeUndefined();
  });

  it('non-number operands → undefined (never NaN)', () => {
    expect(ev('a * 2', { a: 'x' })).toBeUndefined();
    expect(ev('2 * a', { a: 'x' })).toBeUndefined();
  });

  it('division by zero → undefined', () => {
    expect(ev('a / 0', { a: 5 })).toBeUndefined();
  });
});

describe('evalExpr — recovery', () => {
  it('unknown operator → false', () => {
    const expr: Expr = {
      kind: 'binary',
      op: '??',
      left: { kind: 'literal', value: 1 },
      right: { kind: 'literal', value: 1 },
    };
    expect(evalExpr(expr, {})).toBe(false);
  });
  it('evaluates a hand-built arithmetic node', () => {
    const expr: Expr = {
      kind: 'arith',
      op: '+',
      left: { kind: 'literal', value: 1 },
      right: { kind: 'literal', value: 2 },
    };
    expect(evalExpr(expr, {})).toBe(3);
  });
});

describe('evalCondition', () => {
  it('applies truthiness to the evaluated value', () => {
    expect(cond('user.tags', { user: { tags: ['a'] } })).toBe(true);
    expect(cond('user.tags', { user: { tags: [] } })).toBe(false);
  });
});
