import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { typecheck } from '../../src/typecheck';
import type { FieldSchema } from '../../src/types';

const schema: FieldSchema = [
  { path: 'user.name', type: 'string', name: 'Name' },
  { path: 'user.mrr', type: 'number' },
  { path: 'user.plan', type: 'enum', values: ['free', 'pro', 'team'] },
  {
    path: 'user.lead_status',
    type: 'multiEnum',
    values: ['new', 'qualified', 'lost'],
    name: 'Lead Status',
  },
  { path: 'user.created_at', type: 'datetime' },
  { path: 'user.status', type: 'enum' },
  { path: 'user.csm.name', type: 'string' },
  { path: 'user.custom.*', type: 'dynamic' },
];

const check = (src: string) => typecheck(parse(src).ast, schema);
const codes = (src: string) => check(src).map((d) => d.code);

describe('typecheck — clean templates', () => {
  it('no diagnostics for valid conditions/interpolations', () => {
    expect(check('Hi {{ user.name | default: "there" }}!')).toEqual([]);
    expect(codes('{{if user.plan == "pro"}}x{{/if}}')).toEqual([]);
    expect(codes('{{if user.mrr > 100}}x{{/if}}')).toEqual([]);
    expect(codes('{{if user.created_at exists}}x{{/if}}')).toEqual([]);
    expect(codes('{{if user.lead_status contains "new"}}x{{/if}}')).toEqual([]);
    expect(codes('{{if user.csm exists}}x{{/if}}')).toEqual([]);
    expect(codes('{{if user.custom.score == 1}}x{{/if}}')).toEqual([]);
    expect(codes('{{if true}}x{{/if}}')).toEqual([]);
  });
});

describe('typecheck — ML101 unknown-field', () => {
  it('flags an unknown path and suggests the nearest', () => {
    const d = check('{{user.plann}}')[0];
    expect(d?.code).toBe('ML101');
    expect(d?.message).toContain('user.plan');
  });

  it('flags an unknown path with no close suggestion', () => {
    expect(codes('{{user.zzzzzzz}}')).toEqual(['ML101']);
  });

  it('walks not / logical / nested-if / interpolation bodies', () => {
    expect(codes('{{if not user.plann}}x{{/if}}')).toEqual(['ML101']);
    expect(codes('{{if user.plann and user.zzzzzzz}}x{{/if}}')).toEqual(['ML101', 'ML101']);
    expect(codes('{{if user.plan == "pro"}}{{user.plann}}{{/if}}')).toEqual(['ML101']);
  });

  it('recurses into arithmetic operands', () => {
    expect(codes('{{ 14 - user.plann }}')).toEqual(['ML101']);
  });

  it('recurses into function-call arguments', () => {
    expect(codes('{{ calculate(user.plann, 2) }}')).toEqual(['ML101']);
  });
});

describe('typecheck — ML102 unknown-filter', () => {
  it('flags an unknown filter', () => {
    expect(codes('{{ user.name | nope }}')).toEqual(['ML102']);
  });
});

describe('typecheck — ML214 raw date comparison', () => {
  it('flags a raw comparison on a datetime field', () => {
    expect(codes('{{if user.created_at > "2024-01-01"}}x{{/if}}')).toEqual(['ML214']);
  });
});

describe('typecheck — ML220 == on multiEnum', () => {
  it('flags == and offers a contains quickfix', () => {
    const d = check('{{if user.lead_status == "new"}}x{{/if}}')[0];
    expect(d?.code).toBe('ML220');
    expect(d?.quickfixes?.[0]?.title).toContain('contains');
  });
});

describe('typecheck — ML202 unknown enum value', () => {
  it('flags an invalid enum value', () => {
    expect(codes('{{if user.plan == "premium"}}x{{/if}}')).toEqual(['ML202']);
  });

  it('flags an invalid multiEnum value under contains', () => {
    expect(codes('{{if user.lead_status contains "quallified"}}x{{/if}}')).toEqual(['ML202']);
  });

  it('flags an enum with no declared values', () => {
    expect(codes('{{if user.status == "x"}}x{{/if}}')).toEqual(['ML202']);
  });

  it('ignores enum comparisons whose right side is not a string literal', () => {
    expect(codes('{{if user.plan == user.name}}x{{/if}}')).toEqual([]);
    expect(codes('{{if user.plan == 5}}x{{/if}}')).toEqual([]);
  });
});

describe('typecheck — ML201 type mismatch', () => {
  it('flags a numeric operator on a non-number field', () => {
    expect(codes('{{if user.name < 5}}x{{/if}}')).toEqual(['ML201']);
  });

  it('flags a number field compared to a string literal', () => {
    expect(codes('{{if user.mrr == "100"}}x{{/if}}')).toEqual(['ML201']);
  });
});

describe('typecheck — comparison early-returns (no false positives)', () => {
  it('ignores a literal left operand', () => {
    expect(codes('{{if 5 == user.mrr}}x{{/if}}')).toEqual([]);
  });

  it('ignores namespace and dynamic left operands', () => {
    expect(codes('{{if user.csm == user.name}}x{{/if}}')).toEqual([]);
    expect(codes('{{if user.custom.score < 5}}x{{/if}}')).toEqual([]);
  });
});
