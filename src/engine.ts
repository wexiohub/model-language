import { parse } from './parser';
import { typecheck } from './typecheck';
import type { FieldSchema, ValidateOptions, ValidateResult } from './types';

/**
 * Composition root for the editor path: parse → typecheck → budget.
 *
 * SCAFFOLD: `maxTokenEstimate` is null until milestone 0.2 computes the
 * worst-case (all-branches) render size for the ML213 prompt budget.
 */
export function validate(
  source: string,
  schema: FieldSchema,
  opts?: ValidateOptions,
): ValidateResult {
  const { ast, diagnostics } = parse(source);
  const typeDiagnostics = typecheck(ast, schema, opts);
  return {
    ast,
    diagnostics: [...diagnostics, ...typeDiagnostics],
    maxTokenEstimate: null,
  };
}
