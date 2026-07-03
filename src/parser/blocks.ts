import { makeDiagnostic, rangeAt } from '../diagnostics';
import type { Diagnostic, IfNode, Node, TemplateNode } from '../types';
import { parseCondition } from './condition';
import { parseInterpolation } from './expression';
import { classifyTag, type Segment, tagInner } from './lexer';

interface OpenIf {
  ifNode: IfNode;
  /** The current branch's body — where children append (updated on elseif/else). */
  body: Node[];
  startOffset: number;
  endOffset: number;
}

/** 1-based line/column for a source offset. */
function posAt(source: string, offset: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  const limit = Math.min(offset, source.length);
  for (let k = 0; k < limit; k += 1) {
    if (source[k] === '\n') {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  }
  return { line, col };
}

/**
 * Fold the flat lexer segment stream into a nested AST: interpolation tags →
 * InterpolationNode, `if`/`elseif`/`else`/`/if` → nested IfNode, everything
 * else → text. Unclosed `if` → `ML001` (closed at EOF, recovery). A stray
 * `elseif`/`else`/`/if` with no open `if` is kept as text. Never throws.
 */
export function foldBlocks(
  segments: Segment[],
  source: string,
): { nodes: TemplateNode; diagnostics: Diagnostic[] } {
  const root: TemplateNode = [];
  const stack: OpenIf[] = [];
  const diagnostics: Diagnostic[] = [];

  const currentBody = (): Node[] => {
    const top = stack[stack.length - 1];
    return top ? top.body : root;
  };

  for (const seg of segments) {
    if (seg.type === 'text') {
      currentBody().push({ kind: 'text', value: seg.raw });
      continue;
    }
    if (classifyTag(seg.raw) === 'interpolation') {
      const { value, pipeline } = parseInterpolation(tagInner(seg.raw));
      currentBody().push({ kind: 'interpolation', value, pipeline });
      continue;
    }

    const inner = tagInner(seg.raw);
    const boundary = inner.search(/[\s(]/);
    const head = boundary === -1 ? inner : inner.slice(0, boundary);
    const rest = boundary === -1 ? '' : inner.slice(boundary).trim();

    if (head === 'if') {
      const body: Node[] = [];
      const ifNode: IfNode = { kind: 'if', branches: [{ condition: parseCondition(rest), body }] };
      stack.push({ ifNode, body, startOffset: seg.start, endOffset: seg.end });
    } else if (head === 'elseif') {
      const top = stack[stack.length - 1];
      if (top) {
        const body: Node[] = [];
        top.ifNode.branches.push({ condition: parseCondition(rest), body });
        top.body = body;
      } else {
        currentBody().push({ kind: 'text', value: seg.raw });
      }
    } else if (head === 'else') {
      const top = stack[stack.length - 1];
      if (top) {
        const body: Node[] = [];
        top.ifNode.branches.push({ condition: null, body });
        top.body = body;
      } else {
        currentBody().push({ kind: 'text', value: seg.raw });
      }
    } else if (head === '/if') {
      const closed = stack.pop();
      if (closed) {
        currentBody().push(closed.ifNode);
      } else {
        currentBody().push({ kind: 'text', value: seg.raw });
      }
    } else {
      // Unknown block (for / include / directive) — deferred; keep as text.
      currentBody().push({ kind: 'text', value: seg.raw });
    }
  }

  while (stack.length > 0) {
    const open = stack.pop() as OpenIf;
    const start = posAt(source, open.startOffset);
    const end = posAt(source, open.endOffset);
    diagnostics.push(
      makeDiagnostic(
        'ML001',
        "'{{if}}' is never closed. Add '{{/if}}'.",
        rangeAt(start.line, start.col, end.line, end.col),
      ),
    );
    currentBody().push(open.ifNode);
  }

  return { nodes: root, diagnostics };
}
