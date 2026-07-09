import { makeDiagnostic, rangeAt } from './diagnostics';
import { validateDirectives } from './directives/validate-directives';
import { parse } from './parser';
import { typecheck } from './typecheck';
import { estimateMaxTokens } from './typecheck/budget';
import { flowDiagnostics } from './typecheck/flow';
import type { Diagnostic, FieldSchema, ValidateOptions, ValidateResult } from './types';

/**
 * Composition root for the editor path: parse → typecheck → token budget.
 *
 * `maxTokenEstimate` is the worst-case (largest-branch, loops maxed) render
 * size; when the host passes `opts.maxTokenEstimate`, exceeding it raises
 * `ML213`. Never throws.
 */
export function validate(
  source: string,
  schema: FieldSchema,
  opts?: ValidateOptions,
): ValidateResult {
  const { ast, diagnostics } = parse(source);
  const typeDiagnostics = typecheck(ast, schema, opts);
  const flow = flowDiagnostics(ast);
  const maxTokenEstimate = estimateMaxTokens(ast);

  const budgetDiagnostics: Diagnostic[] = [];
  const budget = opts?.maxTokenEstimate;
  if (budget !== undefined && maxTokenEstimate > budget) {
    budgetDiagnostics.push(
      makeDiagnostic(
        'ML213',
        `Prompt may reach ~${maxTokenEstimate} tokens, over the ${budget}-token budget.`,
        rangeAt(1, 1, 1, 1),
      ),
    );
  }

  const directiveDiagnostics = opts?.directives
    ? validateDirectives(ast, opts.directives, schema)
    : [];

  return {
    ast,
    diagnostics: [
      ...diagnostics,
      ...typeDiagnostics,
      ...flow,
      ...budgetDiagnostics,
      ...directiveDiagnostics,
    ],
    maxTokenEstimate,
  };
}
