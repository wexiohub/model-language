import type { Diagnostic, FieldSchema, TemplateNode, ValidateOptions } from '../types';

/**
 * Typechecker — validates an AST against the field schema and returns
 * diagnostics (ML1xx / ML2xx). The editor path runs this on every change.
 *
 * SCAFFOLD: returns no diagnostics yet. Milestone 0.1 implements schema
 * binding, the operator × type matrix, enum / multiEnum value checks, filter
 * signatures, and runs both built-in and host-registered {@link ValidateOptions.rules}.
 */
export function typecheck(
  _ast: TemplateNode,
  _schema: FieldSchema,
  _opts?: ValidateOptions,
): Diagnostic[] {
  // TODO(0.1): real typechecking.
  return [];
}
