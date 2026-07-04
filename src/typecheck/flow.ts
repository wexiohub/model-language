import type { DiagnosticCode } from '../diagnostics';
import { makeDiagnostic, rangeAt } from '../diagnostics';
import { exprToText } from '../parser/serializer';
import type { Diagnostic, Expr, Node, TemplateNode } from '../types';

/**
 * Flow analysis — the two "impossible branch" lint rules (`ML211` unreachable,
 * `ML212` self-contradiction). It is deliberately **conservative**: facts are
 * derived only from a pure conjunction (`and`) of simple atoms — `field == "x"`,
 * a bare path (truthy), or `not path` (falsy). Anything with `or`, or any other
 * shape, yields no facts, so the analysis never reports a false positive.
 */

type Fact =
  | { kind: 'eq'; path: string; value: string }
  | { kind: 'truthy'; path: string }
  | { kind: 'falsy'; path: string };

/** Facts that MUST hold when `expr` is true, if derivable from a conjunction. */
function collectFacts(expr: Expr): Fact[] {
  switch (expr.kind) {
    case 'logical':
      // `and` → both sides hold; `or` → nothing is guaranteed.
      return expr.op === 'and' ? [...collectFacts(expr.left), ...collectFacts(expr.right)] : [];
    case 'binary':
      return expr.op === '==' &&
        expr.left.kind === 'path' &&
        expr.right.kind === 'literal' &&
        typeof expr.right.value === 'string'
        ? [{ kind: 'eq', path: expr.left.path, value: expr.right.value }]
        : [];
    case 'path':
      return [{ kind: 'truthy', path: expr.path }];
    case 'not':
      return expr.expr.kind === 'path' ? [{ kind: 'falsy', path: expr.expr.path }] : [];
    default:
      return [];
  }
}

/** A set of facts is contradictory if a field must equal two values, or a path
 *  must be both truthy and falsy. */
function isContradictory(facts: Fact[]): boolean {
  const eq = new Map<string, string>();
  const truthy = new Set<string>();
  const falsy = new Set<string>();
  for (const fact of facts) {
    if (fact.kind === 'eq') {
      const seen = eq.get(fact.path);
      if (seen !== undefined && seen !== fact.value) return true;
      eq.set(fact.path, fact.value);
    } else if (fact.kind === 'truthy') {
      if (falsy.has(fact.path)) return true;
      truthy.add(fact.path);
    } else {
      if (truthy.has(fact.path)) return true;
      falsy.add(fact.path);
    }
  }
  return false;
}

export function flowDiagnostics(ast: TemplateNode): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const push = (code: DiagnosticCode, message: string): void => {
    diags.push(makeDiagnostic(code, message, rangeAt(1, 1, 1, 1)));
  };

  const walk = (nodes: TemplateNode, context: Fact[]): void => {
    for (const node of nodes) walkNode(node, context);
  };

  const walkNode = (node: Node, context: Fact[]): void => {
    if (node.kind === 'if') {
      const seen: string[] = [];
      for (const branch of node.branches) {
        if (branch.condition === null) {
          walk(branch.body, context);
          continue;
        }
        const facts = collectFacts(branch.condition);
        const text = exprToText(branch.condition);
        if (isContradictory(facts)) {
          push('ML212', 'This condition can never be true — it contradicts itself.');
        } else if (isContradictory([...context, ...facts])) {
          push('ML211', 'This branch can never run — an enclosing condition already rules it out.');
        } else if (seen.includes(text)) {
          push('ML211', 'This branch repeats an earlier condition and can never run.');
        }
        seen.push(text);
        walk(branch.body, [...context, ...facts]);
      }
    } else if (node.kind === 'for') {
      walk(node.body, context);
      if (node.elseBody) walk(node.elseBody, context);
    } else if (node.kind === 'directive') {
      walk(node.body, context);
    }
  };

  walk(ast, []);
  return diags;
}
