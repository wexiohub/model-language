import type { ParseResult, TemplateNode } from '../types';
import { parseInterpolation } from './expression';
import { classifyTag, tagInner, tokenize } from './lexer';

/**
 * Parser — turns template source into a {@link TemplateNode} AST.
 *
 * Interpolation tags (`{{ path | filters }}`) become `InterpolationNode`s.
 * Block tags (`{{if …}}`, `{{for …}}`, directives) are kept verbatim as text
 * for now — block parsing lands in milestone 0.1b. Text is preserved exactly.
 * Never throws.
 */
export function parse(source: string): ParseResult {
  const ast: TemplateNode = [];

  for (const segment of tokenize(source)) {
    if (segment.type === 'tag' && classifyTag(segment.raw) === 'interpolation') {
      const { value, pipeline } = parseInterpolation(tagInner(segment.raw));
      ast.push({ kind: 'interpolation', value, pipeline });
      continue;
    }
    // Text, and (for now) block tags: kept verbatim. Block parsing → 0.1b.
    ast.push({ kind: 'text', value: segment.raw });
  }

  return { ast, diagnostics: [] };
}
