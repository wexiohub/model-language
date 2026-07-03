import type { FilterDef } from '../types';
import { BUILTIN_FILTERS } from './builtins';

/**
 * Filter registry — built-in filters plus host-registered ones. A host filter
 * overrides a built-in of the same name. Every filter must be total — on the
 * wrong input type it passes the value through (the typechecker flags ML203); it
 * never throws.
 */
const builtinFilters = new Map<string, FilterDef>(BUILTIN_FILTERS.map((f) => [f.name, f]));
const customFilters = new Map<string, FilterDef>();

/** Register a host-supplied filter (e.g. a locale-aware `currency`). */
export function registerFilter(def: FilterDef): void {
  customFilters.set(def.name, def);
}

/** Resolve a filter by name — host-registered first, then built-in. */
export function getFilter(name: string): FilterDef | undefined {
  return customFilters.get(name) ?? builtinFilters.get(name);
}

/** All known filter names (built-in ∪ registered), de-duplicated. */
export function listFilters(): string[] {
  return [...new Set([...builtinFilters.keys(), ...customFilters.keys()])];
}
