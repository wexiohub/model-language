import { describe, expect, it } from 'vitest';
import { nearestPath } from '../../src/typecheck/suggest';

describe('nearestPath', () => {
  it('suggests the closest path within edit distance 2', () => {
    expect(nearestPath('user.plann', ['user.plan', 'user.name'])).toBe('user.plan');
  });

  it('returns undefined when nothing is close enough', () => {
    expect(nearestPath('zzzzzzz', ['user.plan'])).toBeUndefined();
  });

  it('returns undefined for an empty candidate list', () => {
    expect(nearestPath('x', [])).toBeUndefined();
  });
});
