import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser/parser';
import { estimateTokens, render } from '../../src/render/render';
import type { TemplateNode } from '../../src/types';

const out = (src: string, snap: Record<string, unknown> = {}) => render(parse(src).ast, snap, []);

describe('render — interpolation', () => {
  it('interpolates a path', () => {
    expect(out('Hi {{user.name}}!', { user: { name: 'vasyl' } }).text).toBe('Hi vasyl!');
  });

  it('interpolates a literal', () => {
    expect(out('{{ 42 }}').text).toBe('42');
  });

  it('applies default for null (no warning)', () => {
    const r = out('CSM: {{user.csm.name | default: "our team"}}', { user: { csm: null } });
    expect(r.text).toBe('CSM: our team');
    expect(r.warnings).toEqual([]);
  });

  it('stringifies an array', () => {
    expect(out('{{user.tags}}', { user: { tags: ['beta', 'vip'] } }).text).toBe('beta, vip');
  });

  it('passes an unknown filter through', () => {
    expect(out('{{ user.name | nope }}', { user: { name: 'x' } }).text).toBe('x');
  });

  it('warns ML301 on an empty interpolation', () => {
    const r = out('Hi {{user.name}}!', { user: {} });
    expect(r.text).toBe('Hi !');
    expect(r.warnings.map((w) => w.code)).toEqual(['ML301']);
  });

  it('renders arithmetic in interpolation', () => {
    expect(out('Suspended in {{ 14 - user.days }} days.', { user: { days: 9 } }).text).toBe(
      'Suspended in 5 days.',
    );
    expect(out('{{ (a + b) * 2 }}', { a: 3, b: 4 }).text).toBe('14');
  });

  it('uses the render `now` option for datetime filters', () => {
    const src = '{{if user.last | days_ago > 20}}dormant{{/if}}';
    const r = render(parse(src).ast, { user: { last: '2026-06-01' } }, [], {
      now: Date.UTC(2026, 6, 3),
    });
    expect(r.text).toBe('dormant');
  });
});

describe('render — conditionals', () => {
  it('renders the body when the condition is true', () => {
    expect(out('{{if user.plan == "pro"}}Priority.{{/if}}', { user: { plan: 'pro' } }).text).toBe(
      'Priority.',
    );
  });

  it('renders nothing when false with no else', () => {
    expect(out('{{if a}}x{{/if}}', { a: false }).text).toBe('');
  });

  it('takes the else branch', () => {
    expect(out('{{if a}}x{{else}}y{{/if}}', { a: false }).text).toBe('y');
  });

  it('picks the matching elseif', () => {
    const src = '{{if a}}A{{elseif b}}B{{else}}C{{/if}}';
    expect(out(src, { a: false, b: true }).text).toBe('B');
    expect(out(src, { a: false, b: false }).text).toBe('C');
  });

  it('renders nested ifs', () => {
    expect(out('{{if a}}{{if b}}AB{{/if}}{{/if}}', { a: true, b: true }).text).toBe('AB');
  });

  it('records resolvedBranches (condition text + result)', () => {
    const r = out('{{if user.plan == "pro"}}x{{/if}}', { user: { plan: 'pro' } });
    expect(r.resolvedBranches).toEqual([
      { line: 1, condition: 'user.plan == "pro"', result: true },
    ]);
  });

  it('drops block-only lines cleanly (no blank residue)', () => {
    expect(out('A\n{{if x}}\nB\n{{/if}}\nC', { x: true }).text).toBe('A\nB\nC');
    expect(out('A\n{{if x}}\nB\n{{/if}}\nC', { x: false }).text).toBe('A\nC');
  });
});

describe('render — loops', () => {
  it('iterates an array with loop locals (index, last)', () => {
    const src = '{{for item in xs}}{{loop.index}}:{{item}}{{if not loop.last}}, {{/if}}{{/for}}';
    expect(out(src, { xs: ['a', 'b', 'c'] }).text).toBe('1:a, 2:b, 3:c');
  });

  it('exposes item fields and loop.first / loop.count', () => {
    const src =
      '{{for o in orders}}{{o.id}}{{if loop.first}}(first){{/if}}/{{loop.count}} {{/for}}';
    // inter-item spaces preserved; the final trailing space is stripped by hygiene
    expect(out(src, { orders: [{ id: 'A' }, { id: 'B' }] }).text).toBe('A(first)/2 B/2');
  });

  it('renders the else branch for an empty array', () => {
    expect(out('{{for t in xs}}x{{else}}none{{/for}}', { xs: [] }).text).toBe('none');
  });

  it('renders nothing for an empty array with no else', () => {
    expect(out('{{for t in xs}}x{{/for}}', { xs: [] }).text).toBe('');
  });

  it('treats a non-array source as empty', () => {
    expect(out('{{for t in xs}}x{{else}}none{{/for}}', { xs: 42 }).text).toBe('none');
  });

  it('applies a filter pipeline to the loop source', () => {
    const src = '{{for x in items | limit: 2}}{{x}};{{/for}}';
    expect(out(src, { items: ['a', 'b', 'c', 'd'] }).text).toBe('a;b;');
  });
});

describe('render — whitespace & misc', () => {
  it('collapses 3+ newlines and strips trailing whitespace', () => {
    expect(out('A\n\n\n\nB').text).toBe('A\n\nB');
    expect(out('A   \nB').text).toBe('A\nB');
  });

  it('skips comment / non-renderable nodes', () => {
    const ast: TemplateNode = [{ kind: 'text', value: 'a' }, { kind: 'comment' }];
    expect(render(ast, {}, []).text).toBe('a');
  });

  it('empty AST → empty result', () => {
    expect(render([], {}, [])).toEqual({
      text: '',
      warnings: [],
      resolvedBranches: [],
      tokenEstimate: 0,
    });
  });

  it('estimateTokens ~4 chars/token', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });
});
