import type { Severity } from '../types';

/**
 * The complete `ML###` diagnostic catalog: code → default severity.
 *
 * Emitters reference these codes so severity stays consistent. Human-readable
 * messages are built at the call site (and localized by the host). See
 * `docs/diagnostics.md` for the cause/fix of each code.
 */
export const DIAGNOSTIC_CODES = {
  // Parse (ML0xx)
  ML001: 'error', // unclosed-block
  ML002: 'error', // circular-include
  // Field / structure (ML1xx)
  ML101: 'error', // unknown-field
  ML102: 'error', // unknown-filter
  // Type (ML2xx)
  ML201: 'error', // type-mismatch
  ML202: 'error', // unknown-enum-value
  ML203: 'error', // filter-type-mismatch
  ML210: 'warning', // missing-default
  ML211: 'warning', // unreachable-branch
  ML212: 'warning', // contradiction
  ML213: 'warning', // prompt-too-long
  ML214: 'error', // date-raw-comparison
  ML220: 'error', // enum-is-array (== on multiEnum)
  ML221: 'warning', // loop-var-shadowing
  // Directives (ML24x)
  ML240: 'error', // unknown-directive
  ML241: 'error', // missing-required-argument
  ML242: 'error', // argument-shape/type-mismatch
  ML243: 'error', // enum-value-not-in-values
  ML244: 'error', // unexpected/extra-argument
  // Render (ML3xx) — warnings only, never block
  ML301: 'warning', // empty-interpolation
  ML302: 'warning', // object-interpolation
  ML303: 'warning', // dynamic-coercion-failed
  ML304: 'warning', // enum-drift
  ML305: 'warning', // division-by-zero
  ML306: 'warning', // arithmetic-non-number (null/invalid operand → result undefined)
  ML310: 'warning', // provider-failed
} as const satisfies Record<string, Severity>;

export type DiagnosticCode = keyof typeof DIAGNOSTIC_CODES;
