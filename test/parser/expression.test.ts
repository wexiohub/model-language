import { describe, expect, it } from 'vitest';
import { parseInterpolation } from '../../src/parser/expression';

describe('parseInterpolation', () => {
  it('parses a bare path', () => {
    expect(parseInterpolation('user.name')).toEqual({
      value: { kind: 'path', path: 'user.name' },
      pipeline: [],
    });
  });

  it('parses a path with a filter and a string arg', () => {
    expect(parseInterpolation('user.name | default: "there"')).toEqual({
      value: { kind: 'path', path: 'user.name' },
      pipeline: [{ name: 'default', args: [{ kind: 'literal', value: 'there' }] }],
    });
  });

  it('parses a single-quoted string arg', () => {
    expect(parseInterpolation("user.name | default: 'hi'").pipeline).toEqual([
      { name: 'default', args: [{ kind: 'literal', value: 'hi' }] },
    ]);
  });

  it('parses a filter arg that is itself a path', () => {
    expect(parseInterpolation('user.name | default: org.fallback')).toEqual({
      value: { kind: 'path', path: 'user.name' },
      pipeline: [{ name: 'default', args: [{ kind: 'path', path: 'org.fallback' }] }],
    });
  });

  it('parses a no-argument filter', () => {
    expect(parseInterpolation('user.name | upper').pipeline).toEqual([{ name: 'upper', args: [] }]);
  });

  it('chains multiple filters', () => {
    expect(parseInterpolation('user.bio | trim | truncate: 80').pipeline).toEqual([
      { name: 'trim', args: [] },
      { name: 'truncate', args: [{ kind: 'literal', value: 80 }] },
    ]);
  });

  it('parses literal values (string, number, boolean, null, undefined)', () => {
    expect(parseInterpolation('42').value).toEqual({ kind: 'literal', value: 42 });
    expect(parseInterpolation('3.14').value).toEqual({ kind: 'literal', value: 3.14 });
    expect(parseInterpolation('true').value).toEqual({ kind: 'literal', value: true });
    expect(parseInterpolation('false').value).toEqual({ kind: 'literal', value: false });
    expect(parseInterpolation('null').value).toEqual({ kind: 'literal', value: null });
    expect(parseInterpolation('undefined').value).toEqual({ kind: 'literal', value: undefined });
  });

  it('ignores `|` inside a quoted string arg', () => {
    expect(parseInterpolation('x | default: "a|b"').pipeline).toEqual([
      { name: 'default', args: [{ kind: 'literal', value: 'a|b' }] },
    ]);
  });
});
