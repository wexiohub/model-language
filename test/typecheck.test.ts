import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser';
import { typecheck } from '../src/typecheck';

describe('typecheck', () => {
  it('returns no diagnostics yet (scaffold), with and without options', () => {
    const { ast } = parse('Hello {{user.name}}');
    expect(typecheck(ast, [])).toEqual([]);
    expect(
      typecheck(ast, [{ path: 'user.name', type: 'string' }], { agentId: 'a1' }),
    ).toEqual([]);
  });
});
