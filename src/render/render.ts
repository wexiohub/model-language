import type { DataSnapshot, FieldSchema, RenderResult, TemplateNode } from '../types';

/**
 * Renderer — evaluates an AST against a typed data snapshot into the final
 * string. The runtime path.
 *
 * PRIME DIRECTIVE: this function MUST NEVER throw and MUST NEVER leak template
 * syntax. Every runtime problem degrades gracefully (empty string / false
 * branch) and is recorded in `warnings` (ML3xx).
 *
 * SCAFFOLD: emits text nodes; non-text nodes render empty until milestone 0.1
 * adds expression evaluation, branch resolution, filters, and the warning /
 * resolved-branch report.
 */
export function render(
  ast: TemplateNode,
  _snapshot: DataSnapshot,
  _schema: FieldSchema,
): RenderResult {
  let text = '';
  for (const node of ast) {
    if (node.kind === 'text') {
      text += node.value;
    }
    // TODO(0.1): evaluate interpolation / if / for / include / directive.
  }

  return { text, warnings: [], resolvedBranches: [], tokenEstimate: estimateTokens(text) };
}

/** Rough token estimate (~4 chars/token). Refined in milestone 0.2. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
