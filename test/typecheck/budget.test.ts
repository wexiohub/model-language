import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { estimateMaxTokens } from '../../src/typecheck/budget';
import type { TemplateNode } from '../../src/types';

const est = (src: string) => estimateMaxTokens(parse(src).ast);

describe('estimateMaxTokens — worst-case prompt budget', () => {
  it('counts text exactly (~4 chars/token)', () => {
    expect(est('abcd')).toBe(1);
    expect(est('abcde')).toBe(2);
  });

  it('uses a nominal width for an interpolation', () => {
    expect(est('{{ user.name }}')).toBe(6); // 24 nominal chars / 4
  });

  it('uses a nominal width for an include', () => {
    expect(est('{{include "greeting"}}')).toBe(12); // 48 nominal chars / 4
  });

  it('takes only the largest branch of an if', () => {
    const big = est('{{if a}}x{{else}}xxxxxxxxxxxxxxxx{{/if}}');
    const small = est('{{if a}}x{{else}}yy{{/if}}');
    expect(big).toBeGreaterThan(small);
  });

  it('multiplies a loop body by the assumed iteration count', () => {
    expect(est('{{for i in xs}}abcd{{/for}}')).toBe(10); // 4 chars * 10 iterations / 4
  });

  it('accounts for a loop else body', () => {
    expect(est('{{for i in xs}}a{{else}}none{{/for}}')).toBeGreaterThan(0);
  });

  it('sums directive bodies', () => {
    expect(est('{{#priority high}}abcd{{/priority}}')).toBe(1);
  });

  it('ignores comment nodes', () => {
    const ast: TemplateNode = [{ kind: 'text', value: 'abcd' }, { kind: 'comment' }];
    expect(estimateMaxTokens(ast)).toBe(1);
  });
});
