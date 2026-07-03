import type { Expr, Filter, Node, TemplateNode } from '../types';

/**
 * Serializer — renders an AST back to canonical template text with
 * deterministic whitespace. Invariant: `parse(serialize(ast)) ≡ ast`.
 * Canonical forms: `{{ path | filter: arg }}`, `{{if <cond>}}` /
 * `{{elseif <cond>}}` / `{{else}}` / `{{/if}}`.
 */
export function serialize(ast: TemplateNode): string {
  return ast.map(nodeToText).join('');
}

function literalToText(v: string | number | boolean | null | undefined | unknown[]): string {
  if (typeof v === 'string') return `"${v}"`;
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) {
    return `[${v.map((x) => (typeof x === 'string' ? `"${x}"` : String(x))).join(', ')}]`;
  }
  return String(v);
}

/** Serialize an expression to canonical condition/interpolation text. */
export function exprToText(expr: Expr): string {
  switch (expr.kind) {
    case 'path':
      return expr.path;
    case 'literal':
      return literalToText(expr.value);
    case 'not':
      return `not ${exprToText(expr.expr)}`;
    case 'binary':
      return expr.op === 'exists'
        ? `${exprToText(expr.left)} exists`
        : `${exprToText(expr.left)} ${expr.op} ${exprToText(expr.right)}`;
    case 'logical':
    case 'arith':
      return `${exprToText(expr.left)} ${expr.op} ${exprToText(expr.right)}`;
  }
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
    case 'if': {
      const parts: string[] = [];
      node.branches.forEach((branch, i) => {
        if (branch.condition === null) {
          parts.push('{{else}}');
        } else {
          parts.push(`{{${i === 0 ? 'if' : 'elseif'} ${exprToText(branch.condition)}}}`);
        }
        parts.push(serialize(branch.body));
      });
      return `${parts.join('')}{{/if}}`;
    }
    case 'for': {
      const head = `{{for ${node.item} in ${exprToText(node.source)}}}`;
      const elsePart = node.elseBody ? `{{else}}${serialize(node.elseBody)}` : '';
      return `${head}${serialize(node.body)}${elsePart}{{/for}}`;
    }
    default:
      return ''; // include / directive / comment (0.3+)
  }
}
