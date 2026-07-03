import { type Segment, classifyTag } from './lexer';

/**
 * Block-line trimming (Jinja `trim_blocks` + `lstrip_blocks`): when a block tag
 * sits alone on its line, absorb that line's whitespace — strip the indent
 * before the tag and the single newline right after it — so `{{if}}` / `{{/if}}`
 * on their own lines leave no blank residue in the output. Interpolation tags
 * are untouched. Returns new segments (inputs are not mutated).
 */
export function trimBlockLines(segments: Segment[]): Segment[] {
  const out = segments.map((s) => ({ ...s }));
  out.forEach((seg, i) => {
    if (seg.type !== 'tag' || classifyTag(seg.raw) !== 'block') return;
    const prev = out[i - 1];
    const next = out[i + 1];
    if (prev && prev.type === 'text') {
      prev.raw = prev.raw.replace(/(^|\n)[ \t]*$/, '$1');
    }
    if (next && next.type === 'text') {
      next.raw = next.raw.replace(/^[ \t]*\n/, '');
    }
  });
  return out;
}
