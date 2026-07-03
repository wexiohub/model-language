import { describe, expect, it } from 'vitest';
import { resolvePath } from '../../src/render/resolve-path';

describe('resolvePath', () => {
  const snap = { user: { name: 'vasyl', csm: null, tags: ['a', 'b'] } };

  it('resolves a nested value', () => {
    expect(resolvePath(snap, 'user.name')).toBe('vasyl');
  });

  it('returns undefined for a missing path', () => {
    expect(resolvePath(snap, 'user.plan')).toBeUndefined();
  });

  it('returns null for an explicit null', () => {
    expect(resolvePath(snap, 'user.csm')).toBeNull();
  });

  it('short-circuits through null without throwing', () => {
    expect(resolvePath(snap, 'user.csm.name')).toBeUndefined();
  });

  it('short-circuits through undefined without throwing', () => {
    expect(resolvePath(snap, 'nope.deep.path')).toBeUndefined();
  });

  it('short-circuits through a primitive (non-object) parent', () => {
    expect(resolvePath(snap, 'user.name.length')).toBeUndefined();
  });
});
