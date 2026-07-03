import { describe, expect, it } from 'vitest';
import { parseCondition } from '../../src/parser/condition';

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
    expect(parseCondition('a startsWith "x"')).toMatchObject({ op: 'startsWith' });
    expect(parseCondition('a endsWith "x"')).toMatchObject({ op: 'endsWith' });
    expect(parseCondition('a matches "x"')).toMatchObject({ op: 'matches' });
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
    expect(parseCondition("a == 'x'").right).toEqual({ kind: 'literal', value: 'x' });
    expect(parseCondition('a == true').right).toEqual({ kind: 'literal', value: true });
    expect(parseCondition('a == false').right).toEqual({ kind: 'literal', value: false });
    expect(parseCondition('a == null').right).toEqual({ kind: 'literal', value: null });
    expect(parseCondition('a == undefined').right).toEqual({ kind: 'literal', value: undefined });
    expect(parseCondition('a == 3.14').right).toEqual({ kind: 'literal', value: 3.14 });
    expect(parseCondition('a == -5').right).toEqual({ kind: 'literal', value: -5 });
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
    expect(parseCondition('x in [a, b]').right).toEqual({ kind: 'literal', value: ['a', 'b'] });
  });

  it('parses an array without surrounding spaces', () => {
    expect(parseCondition('x in[1]').right).toEqual({ kind: 'literal', value: [1] });
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
