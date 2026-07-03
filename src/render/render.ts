import { makeDiagnostic, rangeAt } from '../diagnostics';
import { getFilter } from '../filters';
import type {
  DataSnapshot,
  Diagnostic,
  Expr,
  FieldSchema,
  Filter,
  InterpolationNode,
  RenderResult,
  TemplateNode,
} from '../types';
import { resolvePath } from './resolve-path';
import { stringifyValue } from './stringify';

/**
 * Renderer — evaluates an AST against a typed data snapshot into the final
 * string. The runtime (hot) path: pure, synchronous, allocation-light, and it
 * MUST NEVER throw or leak template syntax. Problems degrade to empty output +
 * a `warnings` entry.
 */
export function render(
  ast: TemplateNode,
  snapshot: DataSnapshot,
  _schema: FieldSchema,
): RenderResult {
  let text = '';
  const warnings: Diagnostic[] = [];

  for (const node of ast) {
    if (node.kind === 'text') {
      text += node.value;
    } else if (node.kind === 'interpolation') {
      text += renderInterpolation(node, snapshot, warnings);
    }
    // if / for / include / directive / comment: 0.1b+ (render nothing for now).
  }

  return { text, warnings, resolvedBranches: [], tokenEstimate: estimateTokens(text) };
}

function evalExpr(expr: Expr, snapshot: DataSnapshot): unknown {
  if (expr.kind === 'path') return resolvePath(snapshot, expr.path);
  if (expr.kind === 'literal') return expr.value;
  return undefined; // binary / logical / not / arith: 0.1b.
}

function applyFilter(filter: Filter, input: unknown, snapshot: DataSnapshot): unknown {
  const def = getFilter(filter.name);
  if (!def) return input; // unknown filter → pass-through (ML102 is an edit-time lint).
  const args = filter.args.map((arg) => evalExpr(arg, snapshot));
  return def.apply(input, args);
}

function renderInterpolation(
  node: InterpolationNode,
  snapshot: DataSnapshot,
  warnings: Diagnostic[],
): string {
  let value = evalExpr(node.value, snapshot);
  for (const filter of node.pipeline) {
    value = applyFilter(filter, value, snapshot);
  }
  const { text, wasEmpty } = stringifyValue(value);
  if (wasEmpty) {
    warnings.push(
      makeDiagnostic('ML301', 'interpolated an empty value with no default', rangeAt(1, 1, 1, 1)),
    );
  }
  return text;
}

/** Rough token estimate (~4 chars/token). Refined in milestone 0.2. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
