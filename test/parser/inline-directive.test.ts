import { describe, expect, it } from 'vitest';
import { parse, serialize } from '../../src/parser';
import { classifyTag } from '../../src/parser/lexer';

describe('inline directive classification', () => {
  it('classifies a top-level colon token as a directive', () => {
    expect(classifyTag('{{verify_before: calendar}}')).toBe('directive');
    expect(classifyTag('{{identity: contact.email == payment.email}}')).toBe('directive');
    expect(classifyTag('{{assignedTo: [id1, id2]}}')).toBe('directive');
  });

  it('does NOT classify value tokens as directives', () => {
    expect(classifyTag('{{contact.email}}')).toBe('interpolation');
    expect(classifyTag("{{contact.name | default: 'x'}}")).toBe('interpolation'); // colon is inside a filter
  });

  it('leaves block directives as block', () => {
    expect(classifyTag('{{#priority high}}')).toBe('block');
    expect(classifyTag('{{#if a == b}}')).toBe('block');
  });

  it('parses an inline directive into an inlineDirective node with raw arg', () => {
    const { ast } = parse('{{verify_before: calendar}}');
    expect(ast).toEqual([
      {
        kind: 'inlineDirective',
        name: 'verify_before',
        argRaw: 'calendar',
        range: expect.anything(),
      },
    ]);
  });

  it('captures a comparison arg verbatim as argRaw', () => {
    const { ast } = parse('{{identity: contact.email == payment.email}}');
    expect(ast[0]).toMatchObject({
      kind: 'inlineDirective',
      name: 'identity',
      argRaw: 'contact.email == payment.email',
    });
  });

  it('a bare identifier with no colon stays an interpolation', () => {
    const { ast } = parse('{{verify_before}}');
    // biome-ignore lint/style/noNonNullAssertion: test assertion
    expect(ast[0]!.kind).toBe('interpolation');
  });

  it('round-trips through serialize', () => {
    const src = '{{identity: contact.email == payment.email}}';
    expect(serialize(p2(src).ast)).toBe(src);
  });
});

import { parse as p2 } from '../../src/parser';
