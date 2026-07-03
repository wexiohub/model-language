import type { DataSnapshot } from '../types';

/**
 * Resolve a dot path against the snapshot with safe navigation. A `null` /
 * `undefined` / non-object parent short-circuits to `undefined` (never throws).
 * Returns `null` only when the value is explicitly `null`.
 */
export function resolvePath(snapshot: DataSnapshot, path: string): unknown {
  let current: unknown = snapshot;
  for (const segment of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
