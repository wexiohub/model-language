import { describe, expect, it } from 'vitest';
import { parseInterpolation } from '../../src/parser/expression';
import { parse } from '../../src/parser/parser';
import { serialize } from '../../src/parser/serializer';
import type { TemplateNode } from '../../src/types';

describe('parse', () => {
  it('empty source → empty AST, no diagnostics', () => {
    expect(parse('')).toEqual({ ast: [], diagnostics: [] });
  });

  it('plain text → one text node', () => {
    expect(parse('Hello').ast).toEqual([{ kind: 'text', value: 'Hello' }]);
  });

  it('emits an interpolation node for an interpolation tag', () => {
    expect(parse('Hi {{user.name}}!').ast).toEqual([
      { kind: 'text', value: 'Hi ' },
      { kind: 'interpolation', ...parseInterpolation('user.name') },
      { kind: 'text', value: '!' },
    ]);
  });

  it('keeps block tags as text (0.1b will parse them)', () => {
    expect(parse('{{if x}}a{{/if}}').ast).toEqual([
      { kind: 'text', value: '{{if x}}' },
      { kind: 'text', value: 'a' },
      { kind: 'text', value: '{{/if}}' },
    ]);
  });
});

describe('serialize', () => {
  it('round-trips text and (deferred) block-tag sources', () => {
    for (const src of ['', 'plain', 'a {{if x}}b{{/if}} c']) {
      expect(serialize(parse(src).ast)).toBe(src);
    }
  });

  it('serializes an interpolation node canonically', () => {
    expect(serialize(parse('{{user.name}}').ast)).toBe('{{ user.name }}');
  });

  it('round-trips a canonical interpolation with a filter', () => {
    const src = 'Hi {{ user.name | default: "there" }}!';
    expect(serialize(parse(src).ast)).toBe(src);
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

  it('serializes literal values (number, string, boolean, null, undefined, array)', () => {
    const lit = (value: string | number | boolean | null | undefined | unknown[]): TemplateNode => [
      { kind: 'interpolation', value: { kind: 'literal', value }, pipeline: [] },
    ];
    expect(serialize(lit(42))).toBe('{{ 42 }}');
    expect(serialize(lit('hi'))).toBe('{{ "hi" }}');
    expect(serialize(lit(true))).toBe('{{ true }}');
    expect(serialize(lit(null))).toBe('{{ null }}');
    expect(serialize(lit(undefined))).toBe('{{ undefined }}');
    expect(serialize(lit(['a', 'b']))).toBe('{{ [a, b] }}');
  });

  it('emits an empty expression body for not-yet-serializable expr kinds', () => {
    const ast: TemplateNode = [
      {
        kind: 'interpolation',
        value: {
          kind: 'binary',
          op: '==',
          left: { kind: 'path', path: 'a' },
          right: { kind: 'literal', value: 1 },
        },
        pipeline: [],
      },
    ];
    expect(serialize(ast)).toBe('{{  }}');
  });

  it('emits empty for node kinds not yet serializable', () => {
    expect(serialize([{ kind: 'comment' }])).toBe('');
  });
});
