import type { ParseResult, TemplateNode } from '../types';
import { tokenize } from './lexer';

/**
 * Parser — turns template source into a {@link TemplateNode} AST.
 *
 * SCAFFOLD: milestone 0.1 replaces tag segments with real `Interpolation` /
 * `If` / `For` / `Include` / `Directive` / `Comment` nodes by parsing the
 * expression + block grammar inside `{{ … }}`, and reports syntax diagnostics
 * (ML0xx) with error recovery. Until then every segment — text OR an
 * as-yet-unparsed tag — is preserved verbatim as a text node: never mangled,
 * never dropped, never thrown. This keeps the round-trip invariant
 * (`parse(serialize(ast)) ≡ ast`) trivially true while the grammar lands.
 */
export function parse(source: string): ParseResult {
  const ast: TemplateNode = [];

  for (const segment of tokenize(source)) {
    // TODO(0.1): if segment.type === 'tag', parse its contents into the right
    // node kind instead of keeping it as literal text.
    ast.push({ kind: 'text', value: segment.raw });
  }

  return { ast, diagnostics: [] };
}
