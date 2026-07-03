import type { DataSnapshot, Expr } from '../types';
import { resolvePath } from './resolve-path';

/**
 * Expression evaluator — the runtime core shared by interpolation and
 * conditions. Pure and total: an operator/type mismatch evaluates to `false`
 * (never throws), and access through null/undefined yields `undefined`.
 */

/** Truthiness for bare `{{if expr}}` (language ref §3.3). */
export function truthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (value === '' || value === 0 || value === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function numCompare(left: unknown, right: unknown, f: (a: number, b: number) => boolean): boolean {
  return typeof left === 'number' && typeof right === 'number' && f(left, right);
}

function safeMatch(text: string, pattern: string): boolean {
  try {
    return new RegExp(pattern).test(text);
  } catch {
    return false;
  }
}

function compare(op: string, left: unknown, right: unknown): boolean {
  switch (op) {
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    case '<':
      return numCompare(left, right, (a, b) => a < b);
    case '>':
      return numCompare(left, right, (a, b) => a > b);
    case '<=':
      return numCompare(left, right, (a, b) => a <= b);
    case '>=':
      return numCompare(left, right, (a, b) => a >= b);
    case 'in':
      return Array.isArray(right) && right.includes(left);
    case 'contains':
      if (Array.isArray(left)) return left.includes(right);
      return typeof left === 'string' && typeof right === 'string' && left.includes(right);
    case 'startsWith':
      return typeof left === 'string' && typeof right === 'string' && left.startsWith(right);
    case 'endsWith':
      return typeof left === 'string' && typeof right === 'string' && left.endsWith(right);
    case 'matches':
      return typeof left === 'string' && typeof right === 'string' && safeMatch(left, right);
    case 'exists':
      return left !== null && left !== undefined;
    default:
      return false;
  }
}

/** Evaluate any expression to a value. Never throws. */
export function evalExpr(expr: Expr, snapshot: DataSnapshot): unknown {
  switch (expr.kind) {
    case 'path':
      return resolvePath(snapshot, expr.path);
    case 'literal':
      return expr.value;
    case 'not':
      return !truthy(evalExpr(expr.expr, snapshot));
    case 'logical': {
      const left = truthy(evalExpr(expr.left, snapshot));
      if (expr.op === 'and') return left && truthy(evalExpr(expr.right, snapshot));
      return left || truthy(evalExpr(expr.right, snapshot));
    }
    case 'binary':
      return compare(expr.op, evalExpr(expr.left, snapshot), evalExpr(expr.right, snapshot));
    default:
      return undefined; // arithmetic: 0.2
  }
}

/** Evaluate an expression as a boolean condition. */
export function evalCondition(expr: Expr, snapshot: DataSnapshot): boolean {
  return truthy(evalExpr(expr, snapshot));
}
