import type { LintRule } from '../types';

/**
 * Lint-rule registry — built-in (generic language) rules plus host-registered
 * (policy) rules. The typechecker runs `allRules()` against the AST.
 *
 * SCAFFOLD: no built-ins yet. Milestone 0.1 adds the generic rules (ML001,
 * ML101, ML201, ML202, ML214, ML220…). Product-specific policy rules (e.g.
 * private-field interpolation) stay host-registered — never baked in here.
 */
const builtinRules: LintRule[] = [];
const customRules: LintRule[] = [];

/** Register a host-supplied lint rule (policy specific to the host). */
export function registerRule(rule: LintRule): void {
  customRules.push(rule);
}

/** Built-in rules followed by host-registered rules, in registration order. */
export function allRules(): LintRule[] {
  return [...builtinRules, ...customRules];
}
