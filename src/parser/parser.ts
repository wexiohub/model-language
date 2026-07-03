import type { ParseResult } from '../types';
import { foldBlocks } from './blocks';
import { tokenize } from './lexer';
import { trimBlockLines } from './whitespace';

/**
 * Parser — turns template source into a {@link ParseResult}. Tokenizes, trims
 * block-line whitespace, then folds the segment stream into a nested AST
 * (text / interpolation / if). Never throws.
 */
export function parse(source: string): ParseResult {
  const segments = trimBlockLines(tokenize(source));
  const { nodes, diagnostics } = foldBlocks(segments, source);
  return { ast: nodes, diagnostics };
}
