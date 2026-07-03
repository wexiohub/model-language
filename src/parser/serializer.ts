import type { Node, TemplateNode } from '../types';

/**
 * Serializer — renders an AST back to canonical template text with
 * deterministic whitespace. Invariant: `parse(serialize(ast)) ≡ ast`.
 *
 * SCAFFOLD: only text nodes exist post-parse today. Milestone 0.1 adds
 * canonical emission for every node kind (`{{ … }}` reconstruction).
 */
export function serialize(ast: TemplateNode): string {
  return ast.map(nodeToText).join('');
}

function nodeToText(node: Node): string {
  switch (node.kind) {
    case 'text':
      return node.value;
    // TODO(0.1): interpolation / if / for / include / directive / comment.
    default:
      return '';
  }
}
