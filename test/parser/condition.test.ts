import { describe, expect, it } from 'vitest';
import { parseCondition } from '../../src/parser/condition';
import type { Expr } from '../../src/types';

const rightOf = (src: string): Expr =>
  (parseCondition(src) as Extract<Expr, { right: Expr }>).right;

describe('parseCondition — comparisons', () => {
  it('parses each comparison operator', () => {
    expect(parseCondition('a == 1')).toMatchObject({ kind: 'binary', op: '==' });
    expect(parseCondition('a != 1')).toMatchObject({ op: '!=' });
    expect(parseCondition('a <= 1')).toMatchObject({ op: '<=' });
    expect(parseCondition('a >= 1')).toMatchObject({ op: '>=' });
    expect(parseCondition('a < 1')).toMatchObject({ op: '<' });
    expect(parseCondition('a > 1')).toMatchObject({ op: '>' });
  });

  it('tokenizes operators without surrounding spaces', () => {
    expect(parseCondition('a==1')).toEqual({
      kind: 'binary',
      op: '==',
      left: { kind: 'path', path: 'a' },
      right: { kind: 'literal', value: 1 },
    });
  });

  it('parses word operators', () => {
    expect(parseCondition('a contains "x"')).toMatchObject({ op: 'contains' });
    expect(parseCondition('a contains_any ["x"]')).toMatchObject({ op: 'contains_any' });
    expect(parseCondition('a contains_all ["x"]')).toMatchObject({ op: 'contains_all' });
    expect(parseCondition('a startsWith "x"')).toMatchObject({ op: 'startsWith' });
    expect(parseCondition('a endsWith "x"')).toMatchObject({ op: 'endsWith' });
    expect(parseCondition('a matches "x"')).toMatchObject({ op: 'matches' });
  });

  it('parses is_empty as a unary operator', () => {
    expect(parseCondition('user.tags is_empty')).toEqual({
      kind: 'binary',
      op: 'is_empty',
      left: { kind: 'path', path: 'user.tags' },
      right: { kind: 'literal', value: null },
    });
  });

  it('parses a full comparison shape', () => {
    expect(parseCondition('user.plan == "pro"')).toEqual({
      kind: 'binary',
      op: '==',
      left: { kind: 'path', path: 'user.plan' },
      right: { kind: 'literal', value: 'pro' },
    });
  });

  it('parses exists as a unary comparison', () => {
    expect(parseCondition('user.csm exists')).toEqual({
      kind: 'binary',
      op: 'exists',
      left: { kind: 'path', path: 'user.csm' },
      right: { kind: 'literal', value: null },
    });
  });
});

describe('parseCondition — literals', () => {
  it('parses every literal kind', () => {
    expect(rightOf("a == 'x'")).toEqual({ kind: 'literal', value: 'x' });
    expect(rightOf('a == true')).toEqual({ kind: 'literal', value: true });
    expect(rightOf('a == false')).toEqual({ kind: 'literal', value: false });
    expect(rightOf('a == null')).toEqual({ kind: 'literal', value: null });
    expect(rightOf('a == undefined')).toEqual({ kind: 'literal', value: undefined });
    expect(rightOf('a == 3.14')).toEqual({ kind: 'literal', value: 3.14 });
    expect(rightOf('a == -5')).toEqual({ kind: 'literal', value: -5 });
  });
});

describe('parseCondition — logic & grouping', () => {
  it('applies precedence (and binds tighter than or)', () => {
    expect(parseCondition('a or b and c')).toEqual({
      kind: 'logical',
      op: 'or',
      left: { kind: 'path', path: 'a' },
      right: {
        kind: 'logical',
        op: 'and',
        left: { kind: 'path', path: 'b' },
        right: { kind: 'path', path: 'c' },
      },
    });
  });

  it('parses not and parentheses', () => {
    expect(parseCondition('not (a == 1)')).toEqual({
      kind: 'not',
      expr: {
        kind: 'binary',
        op: '==',
        left: { kind: 'path', path: 'a' },
        right: { kind: 'literal', value: 1 },
      },
    });
  });

  it('parses nested not', () => {
    expect(parseCondition('not not a')).toEqual({
      kind: 'not',
      expr: { kind: 'not', expr: { kind: 'path', path: 'a' } },
    });
  });

  it('parses a bare path (truthiness)', () => {
    expect(parseCondition('user.tags')).toEqual({ kind: 'path', path: 'user.tags' });
  });
});

describe('parseCondition — arrays', () => {
  it('parses in with an array of string literals', () => {
    expect(parseCondition('user.plan in ["pro", "team"]')).toEqual({
      kind: 'binary',
      op: 'in',
      left: { kind: 'path', path: 'user.plan' },
      right: { kind: 'literal', value: ['pro', 'team'] },
    });
  });

  it('parses an array of bare paths (kept as strings)', () => {
    expect(rightOf('x in [a, b]')).toEqual({ kind: 'literal', value: ['a', 'b'] });
  });

  it('parses an array without surrounding spaces', () => {
    expect(rightOf('x in[1]')).toEqual({ kind: 'literal', value: [1] });
  });
});

describe('parseCondition — recovery (never throws)', () => {
  it('empty string → literal undefined', () => {
    expect(parseCondition('')).toEqual({ kind: 'literal', value: undefined });
  });

  it('unterminated string does not throw', () => {
    expect(() => parseCondition('a == "oops')).not.toThrow();
  });

  it('unterminated paren does not throw', () => {
    expect(parseCondition('not (a == 1')).toMatchObject({ kind: 'not' });
  });

  it('unterminated array does not throw', () => {
    expect(parseCondition('a in [1, 2')).toMatchObject({ op: 'in' });
  });

  it('skips a stray operator char without looping', () => {
    expect(parseCondition('a = 1')).toEqual({ kind: 'path', path: 'a' });
  });
});
