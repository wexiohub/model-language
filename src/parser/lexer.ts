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

const BLOCK_KEYWORDS = ['if', 'elseif', 'else', '/if', 'for', '/for', 'include'];

/** Inner text of a `{{ … }}` tag, delimiters stripped and trimmed. */
export function tagInner(raw: string): string {
  return raw.slice(OPEN.length, raw.length - CLOSE.length).trim();
}

/** Classify a tag by its leading token. Block handling lands in 0.1b. */
export function classifyTag(raw: string): 'interpolation' | 'block' {
  const inner = tagInner(raw);
  if (inner.startsWith('#') || inner.startsWith('{#')) return 'block';
  const head = inner.split(/[\s(]/, 1)[0];
  return BLOCK_KEYWORDS.includes(head) ? 'block' : 'interpolation';
}
