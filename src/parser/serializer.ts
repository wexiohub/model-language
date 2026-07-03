import type { Expr, Filter, Node, TemplateNode } from '../types';

/**
 * Serializer — renders an AST back to canonical template text with
 * deterministic whitespace. Invariant: `parse(serialize(ast)) ≡ ast`.
 *
 * Canonical interpolation form: single spaces inside the braces, ` | ` between
 * filters, `: ` before args, `, ` between args. Block/comment nodes arrive in
 * 0.1b+.
 */
export function serialize(ast: TemplateNode): string {
  return ast.map(nodeToText).join('');
}

function exprToText(expr: Expr): string {
  if (expr.kind === 'path') return expr.path;
  if (expr.kind === 'literal') {
    const v = expr.value;
    if (typeof v === 'string') return `"${v}"`;
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (Array.isArray(v)) return `[${v.map((x) => String(x)).join(', ')}]`;
    return String(v);
  }
  // Binary / logical / not / arith arrive in 0.1b.
  return '';
}

function filterToText(filter: Filter): string {
  if (filter.args.length === 0) return filter.name;
  return `${filter.name}: ${filter.args.map(exprToText).join(', ')}`;
}

function nodeToText(node: Node): string {
  switch (node.kind) {
    case 'text':
      return node.value;
    case 'interpolation': {
      const pipe = node.pipeline.map(filterToText).join(' | ');
      const body = pipe ? `${exprToText(node.value)} | ${pipe}` : exprToText(node.value);
      return `{{ ${body} }}`;
    }
    // if / for / include / directive / comment arrive in 0.1b+.
    default:
      return '';
  }
}
