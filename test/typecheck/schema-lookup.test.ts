import { describe, expect, it } from 'vitest';
import { resolveField } from '../../src/typecheck/schema-lookup';
import type { FieldSchema } from '../../src/types';

const schema: FieldSchema = [
  { path: 'user.name', type: 'string' },
  { path: 'user.csm.name', type: 'string' },
  { path: 'user.custom.*', type: 'dynamic' },
  { path: 'subscription.status', type: 'enum', values: ['active', 'past_due'] },
];

describe('resolveField', () => {
  it('resolves an exact field', () => {
    expect(resolveField('user.name', schema)).toEqual({
      kind: 'field',
      def: { path: 'user.name', type: 'string' },
    });
  });

  it('resolves a namespace/object root (prefix of a field)', () => {
    expect(resolveField('subscription', schema)).toEqual({ kind: 'namespace' });
    expect(resolveField('user.csm', schema)).toEqual({ kind: 'namespace' });
  });

  it('resolves a dynamic (custom) field under a `*` namespace', () => {
    expect(resolveField('user.custom.industry', schema)).toEqual({ kind: 'dynamic' });
  });

  it('returns unknown for a path not in the schema', () => {
    expect(resolveField('user.plann', schema)).toEqual({ kind: 'unknown' });
  });
});
