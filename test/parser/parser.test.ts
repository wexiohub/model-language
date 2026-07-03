import { describe, expect, it } from 'vitest';
import { parseCondition } from '../../src/parser/condition';
import { parseInterpolation } from '../../src/parser/expression';
import { parse } from '../../src/parser/parser';
import { exprToText, serialize } from '../../src/parser/serializer';
import type { TemplateNode } from '../../src/types';

describe('parse', () => {
  it('empty source → empty AST', () => {
    expect(parse('')).toEqual({ ast: [], diagnostics: [] });
  });

  it('plain text → one text node', () => {
    expect(parse('Hello').ast).toEqual([{ kind: 'text', value: 'Hello' }]);
  });

  it('interpolation tag → interpolation node', () => {
    expect(parse('Hi {{user.name}}!').ast).toEqual([
      { kind: 'text', value: 'Hi ' },
      { kind: 'interpolation', ...parseInterpolation('user.name') },
      { kind: 'text', value: '!' },
    ]);
  });

  it('block tag → if node (delegates to foldBlocks)', () => {
    expect(parse('{{if a}}x{{/if}}').ast).toEqual([
      {
        kind: 'if',
        branches: [{ condition: parseCondition('a'), body: [{ kind: 'text', value: 'x' }] }],
      },
    ]);
  });
});

describe('serialize', () => {
  it('round-trips text, interpolation, and if/elseif/else (canonical)', () => {
    for (const src of [
      '',
      'plain',
      'Hi {{ user.name | default: "there" }}!',
      '{{if a == 1}}x{{elseif b exists}}y{{else}}z{{/if}}',
      'a {{if not user.blocked and user.plan in ["pro", "team"]}}b{{/if}} c',
    ]) {
      expect(serialize(parse(src).ast)).toBe(src);
    }
  });

  it('serializes a no-arg filter', () => {
    const ast: TemplateNode = [
      {
        kind: 'interpolation',
        value: { kind: 'path', path: 'x' },
        pipeline: [{ name: 'upper', args: [] }],
      },
    ];
    expect(serialize(ast)).toBe('{{ x | upper }}');
  });

  it('serializes literal values (number, string, boolean, null, undefined, mixed array)', () => {
    const lit = (value: string | number | boolean | null | undefined | unknown[]): TemplateNode => [
      { kind: 'interpolation', value: { kind: 'literal', value }, pipeline: [] },
    ];
    expect(serialize(lit(42))).toBe('{{ 42 }}');
    expect(serialize(lit('hi'))).toBe('{{ "hi" }}');
    expect(serialize(lit(true))).toBe('{{ true }}');
    expect(serialize(lit(null))).toBe('{{ null }}');
    expect(serialize(lit(undefined))).toBe('{{ undefined }}');
    expect(serialize(lit([1, 'a']))).toBe('{{ [1, "a"] }}');
  });

  it('serializes arithmetic and emits empty for unserializable node kinds', () => {
    expect(
      exprToText({
        kind: 'arith',
        op: '+',
        left: { kind: 'path', path: 'a' },
        right: { kind: 'literal', value: 1 },
      }),
    ).toBe('a + 1');
    expect(serialize([{ kind: 'comment' }])).toBe('');
  });
});
