import { makeDiagnostic, rangeAt } from '../diagnostics';
import { getFilter } from '../filters';
import { exprToText } from '../parser/serializer';
import type {
  Branch,
  DataSnapshot,
  Diagnostic,
  FieldSchema,
  Filter,
  ForNode,
  IfNode,
  InterpolationNode,
  RenderResult,
  TemplateNode,
} from '../types';
import { evalCondition, evalExpr } from './eval';
import { stringifyValue } from './stringify';
import { tidyWhitespace } from './whitespace';

interface RenderCtx {
  snapshot: DataSnapshot;
  warnings: Diagnostic[];
  resolvedBranches: Branch[];
}

/**
 * Renderer — evaluates an AST against a typed data snapshot into the final
 * string. The runtime (hot) path: pure, synchronous, never throws, never leaks
 * syntax. Problems degrade to empty output + a `warnings` entry.
 */
export function render(
  ast: TemplateNode,
  snapshot: DataSnapshot,
  _schema: FieldSchema,
): RenderResult {
  const ctx: RenderCtx = { snapshot, warnings: [], resolvedBranches: [] };
  const text = tidyWhitespace(renderNodes(ast, ctx));
  return {
    text,
    warnings: ctx.warnings,
    resolvedBranches: ctx.resolvedBranches,
    tokenEstimate: estimateTokens(text),
  };
}

function renderNodes(nodes: TemplateNode, ctx: RenderCtx): string {
  let text = '';
  for (const node of nodes) {
    if (node.kind === 'text') {
      text += node.value;
    } else if (node.kind === 'interpolation') {
      text += renderInterpolation(node, ctx);
    } else if (node.kind === 'if') {
      text += renderIf(node, ctx);
    } else if (node.kind === 'for') {
      text += renderFor(node, ctx);
    }
    // include / directive / comment: 0.3+ (render nothing).
  }
  return text;
}

function renderFor(node: ForNode, ctx: RenderCtx): string {
  let source = evalExpr(node.source, ctx.snapshot);
  for (const filter of node.pipeline ?? []) {
    source = applyFilter(filter, source, ctx.snapshot);
  }
  const items = Array.isArray(source) ? source : [];
  if (items.length === 0) {
    return node.elseBody ? renderNodes(node.elseBody, ctx) : '';
  }
  let text = '';
  items.forEach((item, i) => {
    const childSnapshot: DataSnapshot = {
      ...ctx.snapshot,
      [node.item]: item,
      loop: { index: i + 1, first: i === 0, last: i === items.length - 1, count: items.length },
    };
    text += renderNodes(node.body, { ...ctx, snapshot: childSnapshot });
  });
  return text;
}

function renderIf(node: IfNode, ctx: RenderCtx): string {
  for (const branch of node.branches) {
    const result = branch.condition === null ? true : evalCondition(branch.condition, ctx.snapshot);
    if (branch.condition !== null) {
      ctx.resolvedBranches.push({ line: 1, condition: exprToText(branch.condition), result });
    }
    if (result) return renderNodes(branch.body, ctx);
  }
  return '';
}

function applyFilter(filter: Filter, input: unknown, snapshot: DataSnapshot): unknown {
  const def = getFilter(filter.name);
  if (!def) return input; // unknown filter → pass-through (ML102 is an edit-time lint).
  const args = filter.args.map((arg) => evalExpr(arg, snapshot));
  return def.apply(input, args);
}

function renderInterpolation(node: InterpolationNode, ctx: RenderCtx): string {
  let value = evalExpr(node.value, ctx.snapshot);
  for (const filter of node.pipeline) {
    value = applyFilter(filter, value, ctx.snapshot);
  }
  const { text, wasEmpty } = stringifyValue(value);
  if (wasEmpty) {
    ctx.warnings.push(
      makeDiagnostic('ML301', 'interpolated an empty value with no default', rangeAt(1, 1, 1, 1)),
    );
  }
  return text;
}

/** Rough token estimate (~4 chars/token). Refined in milestone 0.2. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
