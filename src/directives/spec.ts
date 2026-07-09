import { parseCondition } from '../parser/condition';
import { splitTopLevel } from '../parser/expression';
import type { DirectiveArgSpec, DirectiveSpec, Expr } from '../types';

export type { DirectiveSpec, DirectiveArgSpec } from '../types';

export type DirectiveArgResult =
  | { ok: true; value: string | number | string[] | { left: string; op: string; right: string } }
  | { ok: false; code: 'ML241' | 'ML242' | 'ML243' | 'ML244' };

function pathString(e: Expr): string | null {
  return e.kind === 'path' ? e.path : e.kind === 'literal' ? String(e.value) : null;
}

export function parseDirectiveArg(argRaw: string, spec: DirectiveSpec): DirectiveArgResult {
  const raw = argRaw.trim();
  const arg = spec.arg;
  if (arg === null) return raw === '' ? { ok: true, value: '' } : { ok: false, code: 'ML244' };

  const looksComparison =
    /(^|[^=!<>])[=!<>]=|(^|\s)(in|contains|startsWith|endsWith|matches)\s/.test(raw);
  const hasList =
    splitTopLevel(raw.replace(/^\[|\]$/g, ''), ',').length > 1 || /^\[.*\]$/.test(raw);

  if (arg.kind === 'scalar') {
    if (raw === '') return { ok: false, code: 'ML241' };
    if (looksComparison) return { ok: false, code: 'ML244' };
    if (/(^|[^=!<>])=([^=]|$)/.test(raw)) return { ok: false, code: 'ML244' };
    if (hasList) return { ok: false, code: 'ML242' };
    if (arg.type === 'number') {
      const n = Number(raw);
      return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, code: 'ML242' };
    }
    if (arg.type === 'enum' && arg.values != null && !arg.values.includes(raw))
      return { ok: false, code: 'ML243' };
    return { ok: true, value: raw };
  }

  if (arg.kind === 'list') {
    if (looksComparison) return { ok: false, code: 'ML244' };
    if (/(^|[^=!<>])=([^=]|$)/.test(raw)) return { ok: false, code: 'ML244' };
    const inner = raw.replace(/^\[/, '').replace(/\]$/, '');
    const items = splitTopLevel(inner, ',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return { ok: false, code: 'ML241' };
    if (arg.type === 'enum' && arg.values != null) {
      const values = arg.values;
      if (items.some((i) => !values.includes(i))) return { ok: false, code: 'ML243' };
    }
    return { ok: true, value: items };
  }

  // comparison branch
  if (raw === '') return { ok: false, code: 'ML241' };
  if (/(^|[^=!<>])=([^=]|$)/.test(raw)) return { ok: false, code: 'ML242' };
  const expr = parseCondition(raw);
  if (expr.kind === 'logical') return { ok: false, code: 'ML244' };
  if (expr.kind !== 'binary') return { ok: false, code: 'ML241' };
  const left = pathString(expr.left);
  const right = pathString(expr.right);
  if (left === null || right === null) return { ok: false, code: 'ML244' };
  const ops = arg.comparison?.operators ?? ['=='];
  if (!ops.includes(expr.op)) return { ok: false, code: 'ML242' };
  return { ok: true, value: { left, op: expr.op, right } };
}
