import { describe, expect, it } from 'vitest';
import { type DirectiveSpec, parseDirectiveArg } from '../../src/directives/spec';

const VERIFY: DirectiveSpec = {
  name: 'verify_before',
  hasBody: false,
  arg: { kind: 'scalar', type: 'enum', values: ['payments', 'calendar'] },
};
const MAXCOUNT: DirectiveSpec = {
  name: 'assignedToMaxCount',
  hasBody: false,
  arg: { kind: 'scalar', type: 'number' },
};
const ASSIGN: DirectiveSpec = {
  name: 'assignedTo',
  hasBody: false,
  arg: { kind: 'list', type: 'id' },
};
const ROLES: DirectiveSpec = {
  name: 'assignedToRoles',
  hasBody: false,
  arg: { kind: 'list', type: 'enum', values: ['OWNER', 'ADMIN', 'EDITOR', 'AGENT'] },
};
const IDENTITY: DirectiveSpec = {
  name: 'identity',
  hasBody: false,
  arg: {
    kind: 'comparison',
    type: 'field',
    comparison: { operators: ['=='], operandType: 'field' },
  },
};
const NOARG: DirectiveSpec = {
  name: 'x',
  hasBody: false,
  arg: null,
};
// comparison spec with no explicit operators — falls back to the ['=='] default
const COMPARE_DEFAULT: DirectiveSpec = {
  name: 'compare_default',
  hasBody: false,
  arg: { kind: 'comparison', type: 'field' },
};

describe('parseDirectiveArg', () => {
  it('scalar enum ok', () =>
    expect(parseDirectiveArg('calendar', VERIFY)).toEqual({ ok: true, value: 'calendar' }));
  it('scalar enum not in values → ML243', () =>
    expect(parseDirectiveArg('billing', VERIFY)).toEqual({ ok: false, code: 'ML243' }));
  it('scalar with comparison → ML244', () =>
    expect(parseDirectiveArg('calendar == x', VERIFY)).toEqual({ ok: false, code: 'ML244' }));
  it('scalar with list → ML242', () =>
    expect(parseDirectiveArg('a, b', VERIFY)).toEqual({ ok: false, code: 'ML242' }));
  it('empty scalar → ML241', () =>
    expect(parseDirectiveArg('', VERIFY)).toEqual({ ok: false, code: 'ML241' }));
  it('scalar with bare = → ML244', () =>
    expect(parseDirectiveArg('a = b', VERIFY)).toEqual({ ok: false, code: 'ML244' }));

  it('number ok', () => expect(parseDirectiveArg('10', MAXCOUNT)).toEqual({ ok: true, value: 10 }));
  it('non-number → ML242', () =>
    expect(parseDirectiveArg('ten', MAXCOUNT)).toEqual({ ok: false, code: 'ML242' }));

  it('list with brackets ok', () =>
    expect(parseDirectiveArg('[id1, id2]', ASSIGN)).toEqual({ ok: true, value: ['id1', 'id2'] }));
  it('bare list ok', () =>
    expect(parseDirectiveArg('id1, id2', ASSIGN)).toEqual({ ok: true, value: ['id1', 'id2'] }));
  it('empty list → ML241', () =>
    expect(parseDirectiveArg('[]', ASSIGN)).toEqual({ ok: false, code: 'ML241' }));
  it('list with comparison → ML244', () =>
    expect(parseDirectiveArg('id == x', ASSIGN)).toEqual({ ok: false, code: 'ML244' }));
  it('list with bare = → ML244', () =>
    expect(parseDirectiveArg('a = b', ASSIGN)).toEqual({ ok: false, code: 'ML244' }));
  it('role not in values → ML243', () =>
    expect(parseDirectiveArg('[GUEST]', ROLES)).toEqual({ ok: false, code: 'ML243' }));

  it('comparison ok', () =>
    expect(parseDirectiveArg('contact.email == payment.email', IDENTITY)).toEqual({
      ok: true,
      value: { left: 'contact.email', op: '==', right: 'payment.email' },
    }));
  it('missing comparison → ML241', () =>
    expect(parseDirectiveArg('contact.email', IDENTITY)).toEqual({ ok: false, code: 'ML241' }));
  it('disallowed operator (single =) → ML242', () =>
    expect(parseDirectiveArg('contact.email = payment.email', IDENTITY)).toEqual({
      ok: false,
      code: 'ML242',
    }));
  it('or-chain → ML244', () =>
    expect(parseDirectiveArg('contact.email == a or contact.phone == b', IDENTITY)).toEqual({
      ok: false,
      code: 'ML244',
    }));
  it('comparison empty string → ML241', () =>
    expect(parseDirectiveArg('', IDENTITY)).toEqual({ ok: false, code: 'ML241' }));
  it('disallowed non-= operator → ML242', () =>
    expect(parseDirectiveArg('contact.a != contact.b', IDENTITY)).toEqual({
      ok: false,
      code: 'ML242',
    }));
  it('comparison with literal RHS → ok', () =>
    expect(parseDirectiveArg('contact.email == "v@x.io"', IDENTITY)).toEqual({
      ok: true,
      value: { left: 'contact.email', op: '==', right: 'v@x.io' },
    }));
  it('non-path/non-literal operand → ML244', () =>
    expect(parseDirectiveArg('contact.a + 1 == contact.b', IDENTITY)).toEqual({
      ok: false,
      code: 'ML244',
    }));

  // arg: null branch
  it('null arg: empty string → ok', () =>
    expect(parseDirectiveArg('', NOARG)).toEqual({ ok: true, value: '' }));
  it('null arg: non-empty → ML244', () =>
    expect(parseDirectiveArg('something', NOARG)).toEqual({ ok: false, code: 'ML244' }));

  // comparison spec with no explicit operators (hits the ?? ['=='] default branch)
  it('comparison default operators (no comparison field) → ok with ==', () =>
    expect(parseDirectiveArg('contact.email == payment.email', COMPARE_DEFAULT)).toEqual({
      ok: true,
      value: { left: 'contact.email', op: '==', right: 'payment.email' },
    }));
});
