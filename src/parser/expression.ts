import type { Expr, Filter } from '../types';

/**
 * Split `s` on `sep`, ignoring `sep` inside single/double quotes. Always returns
 * at least one element (the tuple type reflects that, so callers need no
 * undefined guards).
 */
function splitTopLevel(s: string, sep: string): [string, ...string[]] {
  const out: string[] = [];
  let buf = '';
  let quote: string | null = null;
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null;
      buf += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
    } else if (ch === sep) {
      out.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  out.push(buf);
  return out as [string, ...string[]];
}

/** Parse a single operand: a quoted string, number, boolean, null/undefined, or a path. */
function parseValue(raw: string): Expr {
  const t = raw.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return { kind: 'literal', value: t.slice(1, -1) };
  }
  if (t === 'true' || t === 'false') return { kind: 'literal', value: t === 'true' };
  if (t === 'null') return { kind: 'literal', value: null };
  if (t === 'undefined') return { kind: 'literal', value: undefined };
  if (/^-?\d+(\.\d+)?$/.test(t)) return { kind: 'literal', value: Number(t) };
  return { kind: 'path', path: t };
}

/** Parse `value | filter: a, b | filter2` into a value + filter pipeline. */
export function parseInterpolation(inner: string): { value: Expr; pipeline: Filter[] } {
  const [valuePart, ...filterParts] = splitTopLevel(inner, '|');
  const value = parseValue(valuePart);
  const pipeline: Filter[] = filterParts.map((part) => {
    const [namePart, argPart] = splitTopLevel(part, ':');
    const name = namePart.trim();
    const args = argPart === undefined ? [] : splitTopLevel(argPart, ',').map((a) => parseValue(a));
    return { name, args };
  });
  return { value, pipeline };
}
