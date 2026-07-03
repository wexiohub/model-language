import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser/parser';
import { serialize } from '../src/parser/serializer';
import type { TemplateNode } from '../src/types';

describe('parse', () => {
  it('empty source → empty AST, no diagnostics', () => {
    expect(parse('')).toEqual({ ast: [], diagnostics: [] });
  });

  it('plain text → one text node', () => {
    expect(parse('Hello').ast).toEqual([{ kind: 'text', value: 'Hello' }]);
  });

  it('keeps tag segments verbatim as text (0.1 will parse them)', () => {
    expect(parse('a {{x}} b').ast).toEqual([
      { kind: 'text', value: 'a ' },
      { kind: 'text', value: '{{x}}' },
      { kind: 'text', value: ' b' },
    ]);
  });
});

describe('serialize', () => {
  it('parse ∘ serialize is identity on source (round-trip invariant)', () => {
    for (const src of ['', 'plain', 'a {{x}} b', '{{a}}{{b}}']) {
      expect(serialize(parse(src).ast)).toBe(src);
    }
  });

  it('emits empty for node kinds not yet serializable', () => {
    const ast: TemplateNode = [
      { kind: 'interpolation', value: { kind: 'path', path: 'x' }, pipeline: [] },
    ];
    expect(serialize(ast)).toBe('');
  });
});
