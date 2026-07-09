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

  it('renders calculate() in interpolation', () => {
    expect(
      out('Per seat: {{ calculate(user.mrr / user.seats, 2) }}', {
        user: { mrr: 100, seats: 3 },
      }).text,
    ).toBe('Per seat: 33.33');
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

describe('render — includes', () => {
  it('renders a snippet by name (shared snapshot)', () => {
    const r = render(parse('Hi {{include "greeting"}}').ast, { user: { name: 'vasyl' } }, [], {
      snippets: { greeting: '{{user.name}}!' },
    });
    expect(r.text).toBe('Hi vasyl!');
  });

  it('renders nothing for an unknown snippet', () => {
    expect(render(parse('a{{include "missing"}}b').ast, {}, [], { snippets: {} }).text).toBe('ab');
  });

  it('breaks a self-referential cycle (ML002)', () => {
    const r = render(parse('{{include "loop"}}').ast, {}, [], {
      snippets: { loop: 'A{{include "loop"}}' },
    });
    expect(r.text).toBe('A');
    expect(r.warnings.map((w) => w.code)).toEqual(['ML002']);
  });

  it('stops at the max include depth (ML002)', () => {
    const snippets: Record<string, string> = {};
    for (let i = 1; i <= 6; i += 1) snippets[`s${i}`] = `[s${i}]{{include "s${i + 1}"}}`;
    const r = render(parse('{{include "s1"}}').ast, {}, [], { snippets });
    expect(r.text).toBe('[s1][s2][s3][s4][s5]');
    expect(r.warnings.map((w) => w.code)).toEqual(['ML002']);
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

  it('strips {# comments #} at parse time (never rendered)', () => {
    expect(out('Hi{# secret #} there').text).toBe('Hi there');
    expect(out('a {# multi\nline #} b').text).toBe('a  b');
  });

  it('renders directive bodies and collects the directive info', () => {
    const r = out('{{#priority high}}Be urgent.{{/priority}}');
    expect(r.text).toBe('Be urgent.');
    expect(r.directives).toEqual([{ name: 'priority', params: { level: 'high' } }]);
  });

  it('#block renders nothing but is collected', () => {
    const r = out('X{{#block actions: ["refund"]}}Y');
    expect(r.text).toBe('XY');
    expect(r.directives).toEqual([{ name: 'block', params: { actions: ['refund'] } }]);
  });

  it('empty AST → empty result', () => {
    expect(render([], {}, [])).toEqual({
      text: '',
      warnings: [],
      resolvedBranches: [],
      directives: [],
      tokenEstimate: 0,
    });
  });

  it('estimateTokens ~4 chars/token', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });
});

describe('render — inline directives', () => {
  const run = (src: string, snap = {}) => render(parse(src).ast, snap, []);

  it('strips the directive from text and surfaces it with raw arg', () => {
    const r = run('Hi{{verify_before: calendar}}!');
    expect(r.text).toBe('Hi!');
    expect(r.directives).toContainEqual({ name: 'verify_before', params: { raw: 'calendar' } });
  });

  it('surfaces the comparison arg raw', () => {
    const r = run('{{identity: contact.email == payment.email}}X');
    expect(r.text).toBe('X');
    expect(r.directives).toContainEqual({
      name: 'identity',
      params: { raw: 'contact.email == payment.email' },
    });
  });

  it('fires only when the {{if}} branch renders', () => {
    const src = '{{if contact.plan == "pro"}}{{verify_before: payments}}{{/if}}Ask.';
    const on = render(parse(src).ast, { contact: { plan: 'pro' } }, []);
    expect(on.directives).toContainEqual({ name: 'verify_before', params: { raw: 'payments' } });
    expect(on.text).toBe('Ask.');
    const off = render(parse(src).ast, { contact: { plan: 'free' } }, []);
    expect(off.directives).toEqual([]);
    expect(off.text).toBe('Ask.');
  });
});
