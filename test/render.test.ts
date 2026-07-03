import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser/parser';
import { estimateTokens, render } from '../src/render/render';
import type { TemplateNode } from '../src/types';

describe('render', () => {
  it('renders text and honors the prime directive (no throw, no leaked syntax)', () => {
    const { ast } = parse('Just text.');
    const out = render(ast, {}, []);
    expect(out.text).toBe('Just text.');
    expect(out.warnings).toEqual([]);
    expect(out.resolvedBranches).toEqual([]);
    expect(out.tokenEstimate).toBe(estimateTokens('Just text.'));
  });

  it('renders non-text nodes as empty for now', () => {
    const ast: TemplateNode = [{ kind: 'text', value: 'a' }, { kind: 'comment' }];
    expect(render(ast, {}, []).text).toBe('a');
  });

  it('empty AST → empty text, zero tokens', () => {
    expect(render([], {}, [])).toEqual({
      text: '',
      warnings: [],
      resolvedBranches: [],
      tokenEstimate: 0,
    });
  });
});

describe('estimateTokens', () => {
  it('~4 chars per token, rounded up', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });
});
