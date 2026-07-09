/**
 * Lexer — splits template source into raw segments: plain `text` runs and
 * `{{ … }}` `tag` spans. Each segment's `raw` is an exact substring of the
 * source (delimiters included for tags), so a downstream serializer can
 * reconstruct the input byte-for-byte.
 *
 * This is the first stage of the engine. Tag *contents* (the expression /
 * block grammar inside `{{ }}`) are parsed by {@link module:parser}, not here.
 */

const OPEN = '{{';
const CLOSE = '}}';

export type SegmentType = 'text' | 'tag';

export interface Segment {
  type: SegmentType;
  /** Exact source substring for this segment (tags include `{{` and `}}`). */
  raw: string;
  /** Start offset in the source (0-based, inclusive). */
  start: number;
  /** End offset in the source (0-based, exclusive). */
  end: number;
}

export function tokenize(source: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  while (i < source.length) {
    const open = source.indexOf(OPEN, i);

    // No more tags — the rest is text.
    if (open === -1) {
      segments.push({ type: 'text', raw: source.slice(i), start: i, end: source.length });
      break;
    }

    // Text before the tag.
    if (open > i) {
      segments.push({ type: 'text', raw: source.slice(i, open), start: i, end: open });
    }

    const close = source.indexOf(CLOSE, open + OPEN.length);

    // Unclosed tag — keep the remainder verbatim as text (never mangle).
    // TODO(0.1): emit ML001 unclosed-block pointing at `open`.
    if (close === -1) {
      segments.push({ type: 'text', raw: source.slice(open), start: open, end: source.length });
      break;
    }

    const end = close + CLOSE.length;
    segments.push({ type: 'tag', raw: source.slice(open, end), start: open, end });
    i = end;
  }

  return segments;
}

const BLOCK_KEYWORDS = ['if', 'elseif', 'else', 'for', 'include'];

/** Inner text of a `{{ … }}` tag, delimiters stripped and trimmed. */
export function tagInner(raw: string): string {
  return raw.slice(OPEN.length, raw.length - CLOSE.length).trim();
}

import { indexOfTopLevel, splitTopLevel } from './expression';

/** Classify a tag: `#`-directives and `/`-closers are blocks, as are the block
 *  keyword openers; everything else is an interpolation or an inline directive. */
export function classifyTag(raw: string): 'interpolation' | 'block' | 'directive' {
  const inner = tagInner(raw);
  if (inner.startsWith('#') || inner.startsWith('/')) return 'block';
  const boundary = inner.search(/[\s(]/);
  const head = boundary === -1 ? inner : inner.slice(0, boundary);
  if (BLOCK_KEYWORDS.includes(head)) return 'block';
  // Inline directive: `name : rest`, where the colon is BEFORE any `|` filter
  // and the left side is a bare identifier. `contact.name | default: 'x'` is not
  // a directive because its colon is inside the filter (after the pipe).
  const valuePart = splitTopLevel(inner, '|')[0];
  const colon = indexOfTopLevel(valuePart, ':');
  if (colon !== -1 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(valuePart.slice(0, colon).trim())) {
    return 'directive';
  }
  return 'interpolation';
}
