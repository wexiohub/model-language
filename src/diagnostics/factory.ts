import type { Diagnostic, Range } from '../types';
import { DIAGNOSTIC_CODES, type DiagnosticCode } from './codes';

/** Build a 1-based, end-exclusive source range. */
export function rangeAt(
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
): Range {
  return { startLine, startColumn, endLine, endColumn };
}

/**
 * Construct a {@link Diagnostic} with the code's catalog severity. Optional
 * `fieldPath` and `quickfixes` are merged in when provided.
 */
export function makeDiagnostic(
  code: DiagnosticCode,
  message: string,
  range: Range,
  extra: Pick<Partial<Diagnostic>, 'fieldPath' | 'quickfixes'> = {},
): Diagnostic {
  return { code, severity: DIAGNOSTIC_CODES[code], message, range, ...extra };
}
