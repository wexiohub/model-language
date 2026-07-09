import type { InlineDirectiveNode, Range } from '../types';
import { splitTopLevel } from './expression';

/** Parse the inner of a `{{name: arg}}` tag (already classified as a directive)
 *  into an InlineDirectiveNode. `name` is the identifier before the top-level
 *  colon; `argRaw` is everything after it, trimmed. Never throws. */
export function parseInlineDirective(inner: string, range: Range): InlineDirectiveNode {
  const [head, ...rest] = splitTopLevel(inner, ':');
  const name = head.trim();
  const argRaw = rest.join(':').trim();
  return { kind: 'inlineDirective', name, argRaw, range };
}
