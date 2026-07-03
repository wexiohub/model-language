import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser/parser';
import { estimateTokens, render } from '../../src/render/render';
import type { TemplateNode } from '../../src/types';

const out = (src: string, snap: Record<string, unknown>) => render(parse(src).ast, snap, []);

describe('render', () => {
  it('renders plain text and honors the prime directive', () => {
    const r = render(parse('Just text.').ast, {}, []);
    expect(r.text).toBe('Just text.');
    expect(r.warnings).toEqual([]);
    expect(r.resolvedBranches).toEqual([]);
    expect(r.tokenEstimate).toBe(estimateTokens('Just text.'));
  });

  it('interpolates a path value', () => {
    expect(out('Hi {{user.name}}!', { user: { name: 'vasyl' } }).text).toBe('Hi vasyl!');
  });

  it('interpolates a literal value', () => {
    expect(out('{{ 42 }}', {}).text).toBe('42');
  });

  it('applies the default filter for a null value (no warning)', () => {
    const r = out('CSM: {{user.csm.name | default: "our team"}}', { user: { csm: null } });
    expect(r.text).toBe('CSM: our team');
    expect(r.warnings).toEqual([]);
  });

  it('stringifies an array', () => {
    expect(out('{{user.tags}}', { user: { tags: ['beta', 'vip'] } }).text).toBe('beta, vip');
  });

  it('passes an unknown filter through unchanged', () => {
    expect(out('{{ user.name | nope }}', { user: { name: 'x' } }).text).toBe('x');
  });

  it('warns ML301 on an empty interpolation with no default', () => {
    const r = out('Hi {{user.name}}!', { user: {} });
    expect(r.text).toBe('Hi !');
    expect(r.warnings.map((w) => w.code)).toEqual(['ML301']);
  });

  it('renders a non-path/non-literal expression as empty (0.1b fills it in)', () => {
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
    const r = render(ast, {}, []);
    expect(r.text).toBe('');
    expect(r.warnings.map((w) => w.code)).toEqual(['ML301']);
  });

  it('renders non-text/non-interpolation nodes as empty', () => {
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
