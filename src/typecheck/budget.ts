import type { Node, TemplateNode } from '../types';

/**
 * Worst-case static token estimate for the `ML213` prompt budget.
 *
 * Text is counted exactly; dynamic parts use fixed nominal widths because a
 * compile-time estimate has no data: an interpolation and an include are each
 * assumed to be a nominal number of characters wide, a loop is assumed to run
 * `ASSUMED_LOOP_ITERATIONS` times, and an `if` contributes only its largest
 * branch. The result is deliberately an over-estimate, so a template that fits
 * the budget here is a real guarantee at render time.
 */
const CHARS_PER_TOKEN = 4;
const NOMINAL_INTERP_CHARS = 24;
const NOMINAL_INCLUDE_CHARS = 48;
const ASSUMED_LOOP_ITERATIONS = 10;

export function estimateMaxTokens(ast: TemplateNode): number {
  return Math.ceil(maxChars(ast) / CHARS_PER_TOKEN);
}

function maxChars(nodes: TemplateNode): number {
  let total = 0;
  for (const node of nodes) total += nodeChars(node);
  return total;
}

function nodeChars(node: Node): number {
  switch (node.kind) {
    case 'text':
      return node.value.length;
    case 'interpolation':
      return NOMINAL_INTERP_CHARS;
    case 'include':
      return NOMINAL_INCLUDE_CHARS;
    case 'if':
      return node.branches.reduce((max, branch) => Math.max(max, maxChars(branch.body)), 0);
    case 'for':
      return Math.max(
        maxChars(node.body) * ASSUMED_LOOP_ITERATIONS,
        node.elseBody ? maxChars(node.elseBody) : 0,
      );
    case 'directive':
      return maxChars(node.body);
    default:
      return 0; // comment — never rendered
  }
}
