import type { FieldDef, FieldSchema } from '../types';

/**
 * How a dot path relates to the schema:
 * - `field`     — an exact `FieldDef` (its type drives operator/value rules)
 * - `namespace` — an object/namespace root that a concrete field lives under
 *                 (e.g. `subscription` when `subscription.status` exists); valid
 *                 for `exists`, not type-checked
 * - `dynamic`   — under a `*` namespace (custom fields); typed at runtime
 * - `unknown`   — not in the schema at all → ML101
 */
export type Resolution =
  | { kind: 'field'; def: FieldDef }
  | { kind: 'namespace' }
  | { kind: 'dynamic' }
  | { kind: 'unknown' };

export function resolveField(path: string, schema: FieldSchema): Resolution {
  for (const def of schema) {
    if (def.path === path) return { kind: 'field', def };
  }
  for (const def of schema) {
    if (def.path.endsWith('.*') && path.startsWith(def.path.slice(0, -1))) {
      return { kind: 'dynamic' };
    }
  }
  for (const def of schema) {
    if (def.path.startsWith(`${path}.`)) return { kind: 'namespace' };
  }
  return { kind: 'unknown' };
}
