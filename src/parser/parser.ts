import type { ParseResult } from '../types';
import { foldBlocks } from './blocks';
import { tokenize } from './lexer';
import { trimBlockLines } from './whitespace';

/** `{# … #}` comments — stripped before anything else; never rendered. */
const COMMENT_RE = /\{#[\s\S]*?#\}/g;

/**
 * Parser — turns template source into a {@link ParseResult}. Strips comments,
 * tokenizes, trims block-line whitespace, then folds the segment stream into a
 * nested AST (text / interpolation / if / for). Never throws.
 */
export function parse(source: string): ParseResult {
  const cleaned = source.replace(COMMENT_RE, '');
  const segments = trimBlockLines(tokenize(cleaned));
  const { nodes, diagnostics } = foldBlocks(segments, cleaned);
  return { ast: nodes, diagnostics };
}
