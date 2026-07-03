import type { DiagnosticCode } from '../diagnostics';
import { makeDiagnostic, rangeAt } from '../diagnostics';
import { getFilter } from '../filters';
import type {
  Diagnostic,
  Expr,
  FieldSchema,
  Filter,
  Quickfix,
  TemplateNode,
  ValidateOptions,
} from '../types';
import { resolveField } from './schema-lookup';
import { nearestPath } from './suggest';

const NUMERIC_OPS = new Set(['<', '>', '<=', '>=']);
const EQUALITY_OPS = new Set(['==', '!=']);
const RAW_DATE_OPS = new Set(['==', '!=', '<', '>', '<=', '>=']);

/**
 * Typechecker — validates an AST against the field schema and returns
 * diagnostics (ML1xx / ML2xx). Ranges are placeholders in 0.1c; precise
 * positions + applicable quickfix edits arrive with the GraphQL/docJson layer
 * (Phase 2). Never throws.
 */
export function typecheck(
  ast: TemplateNode,
  schema: FieldSchema,
  _opts?: ValidateOptions,
): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const knownPaths = schema.filter((d) => !d.path.endsWith('.*')).map((d) => d.path);

  const push = (
    code: DiagnosticCode,
    message: string,
    fieldPath: string,
    quickfixes?: Quickfix[],
  ): void => {
    const extra: { fieldPath: string; quickfixes?: Quickfix[] } = { fieldPath };
    if (quickfixes) extra.quickfixes = quickfixes;
    diags.push(makeDiagnostic(code, message, rangeAt(1, 1, 1, 1), extra));
  };

  const checkComparison = (left: Expr, op: string, right: Expr): void => {
    if (left.kind !== 'path') return;
    const res = resolveField(left.path, schema);
    if (res.kind !== 'field') return;
    const f = res.def;
    const label = f.name ?? f.path;

    if (f.type === 'datetime' && RAW_DATE_OPS.has(op)) {
      push('ML214', `'${label}' is a date — compare it with a filter, not '${op}'.`, f.path);
      return;
    }
    if (f.type === 'multiEnum' && EQUALITY_OPS.has(op)) {
      const quickfix: Quickfix = { title: `Replace '${op}' with 'contains'`, edits: [] };
      push('ML220', `'${label}' is a multi-select field — use 'contains' not '${op}'.`, f.path, [
        quickfix,
      ]);
      return;
    }
    if (
      (f.type === 'enum' || f.type === 'multiEnum') &&
      right.kind === 'literal' &&
      typeof right.value === 'string' &&
      !(f.values ?? []).includes(right.value)
    ) {
      push('ML202', `'${right.value}' is not a valid value for '${label}'.`, f.path);
      return;
    }
    if (NUMERIC_OPS.has(op) && f.type !== 'number') {
      push('ML201', `'${label}' is ${f.type}, not a number — '${op}' needs numbers.`, f.path);
      return;
    }
    if (f.type === 'number' && right.kind === 'literal' && typeof right.value === 'string') {
      push('ML201', `'${label}' is a number, not the text "${right.value}".`, f.path);
    }
  };

  const checkMissingDefault = (value: Expr, pipeline: Filter[]): void => {
    if (value.kind !== 'path') return;
    const res = resolveField(value.path, schema);
    if (res.kind !== 'field' || res.def.nullable !== true) return;
    if (pipeline.some((filter) => filter.name === 'default')) return;
    const label = res.def.name ?? res.def.path;
    push(
      'ML210',
      `'${label}' can be empty — add '| default: "…"' so the prompt never renders a blank.`,
      res.def.path,
    );
  };

  const checkExpr = (expr: Expr): void => {
    switch (expr.kind) {
      case 'path': {
        if (resolveField(expr.path, schema).kind === 'unknown') {
          const near = nearestPath(expr.path, knownPaths);
          const hint = near ? ` Did you mean '${near}'?` : '';
          push('ML101', `Unknown field '${expr.path}'.${hint}`, expr.path);
        }
        break;
      }
      case 'not':
        checkExpr(expr.expr);
        break;
      case 'logical':
        checkExpr(expr.left);
        checkExpr(expr.right);
        break;
      case 'binary':
        checkExpr(expr.left);
        checkExpr(expr.right);
        checkComparison(expr.left, expr.op, expr.right);
        break;
      case 'arith':
        checkExpr(expr.left);
        checkExpr(expr.right);
        break;
      case 'call':
        for (const arg of expr.args) checkExpr(arg);
        break;
      default:
        break; // literal
    }
  };

  const walk = (nodes: TemplateNode): void => {
    for (const node of nodes) {
      if (node.kind === 'interpolation') {
        checkExpr(node.value);
        checkMissingDefault(node.value, node.pipeline);
        for (const filter of node.pipeline) {
          if (!getFilter(filter.name)) {
            push('ML102', `Unknown filter '${filter.name}'.`, filter.name);
          }
        }
      } else if (node.kind === 'if') {
        for (const branch of node.branches) {
          if (branch.condition) checkExpr(branch.condition);
          walk(branch.body);
        }
      }
    }
  };

  walk(ast);
  return diags;
}
