import type { Expr, Filter } from '../types';
import { parseCondition } from './condition';

/**
 * Split `s` on `sep`, ignoring `sep` inside single/double quotes. Always returns
 * at least one element.
 */
export function splitTopLevel(s: string, sep: string): [string, ...string[]] {
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

/** First index of `delim` at bracket/quote depth 0, or -1. */
export function indexOfTopLevel(src: string, delim: string): number {
  const parts = splitTopLevel(src, delim);
  return parts.length > 1 ? parts[0].length : -1;
}

/**
 * Parse `value | filter: a, b | filter2` into a value + filter pipeline. The
 * value (and each filter argument) is a full expression, so arithmetic works:
 * `{{ (order.total - order.discount) | round: 2 }}`.
 */
export function parseInterpolation(inner: string): { value: Expr; pipeline: Filter[] } {
  const [valuePart, ...filterParts] = splitTopLevel(inner, '|');
  const value = parseCondition(valuePart);
  const pipeline: Filter[] = filterParts.map((part) => {
    const [namePart, argPart] = splitTopLevel(part, ':');
    const name = namePart.trim();
    const args =
      argPart === undefined ? [] : splitTopLevel(argPart, ',').map((a) => parseCondition(a));
    return { name, args };
  });
  return { value, pipeline };
}
