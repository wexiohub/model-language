import { makeDiagnostic, rangeAt } from '../diagnostics';
import type {
  Diagnostic,
  DirectiveNode,
  Expr,
  Filter,
  ForNode,
  IfNode,
  Node,
  TemplateNode,
} from '../types';
import { parseCondition } from './condition';
import { parseInterpolation } from './expression';
import { type Segment, classifyTag, tagInner } from './lexer';

type OpenBlock =
  | { kind: 'if'; node: IfNode; body: Node[]; start: number; end: number }
  | { kind: 'for'; node: ForNode; body: Node[]; start: number; end: number }
  | { kind: 'directive'; node: DirectiveNode; body: Node[]; start: number; end: number };

/** Parse `actions: ["a", "b"]` (the `#block` argument) into a list. */
function parseActions(rest: string): unknown[] {
  const parsed = parseCondition(rest.replace(/^actions\s*:\s*/, ''));
  return parsed.kind === 'literal' && Array.isArray(parsed.value) ? parsed.value : [];
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

/** Parse a `for` header `item in <source> | <filters>` → item + source + pipeline. */
function parseForHeader(inner: string): { item: string; source: Expr; pipeline: Filter[] } {
  const header = inner.slice(inner.indexOf('for') + 3).trim();
  const inIdx = header.indexOf(' in ');
  const item = inIdx === -1 ? header : header.slice(0, inIdx).trim();
  const srcStr = inIdx === -1 ? '' : header.slice(inIdx + 4).trim();
  const { value, pipeline } = parseInterpolation(srcStr);
  return { item, source: value, pipeline };
}

/**
 * Fold the flat lexer segment stream into a nested AST: interpolation tags →
 * InterpolationNode; `if/elseif/else/​/if` → nested IfNode; `for/else/​/for` →
 * ForNode (with an optional empty-state `else`); everything else → text. An
 * unclosed block → `ML001` (closed at EOF). Stray `else`/`/if`/`/for` with no
 * matching open block stay as text. Never throws.
 */
export function foldBlocks(
  segments: Segment[],
  source: string,
): { nodes: TemplateNode; diagnostics: Diagnostic[] } {
  const root: TemplateNode = [];
  const stack: OpenBlock[] = [];
  const diagnostics: Diagnostic[] = [];

  const top = (): OpenBlock | undefined => stack[stack.length - 1];
  const currentBody = (): Node[] => {
    const t = top();
    return t ? t.body : root;
  };
  const asText = (raw: string): void => {
    currentBody().push({ kind: 'text', value: raw });
  };

  for (const seg of segments) {
    if (seg.type === 'text') {
      asText(seg.raw);
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
      const node: IfNode = { kind: 'if', branches: [{ condition: parseCondition(rest), body }] };
      stack.push({ kind: 'if', node, body, start: seg.start, end: seg.end });
    } else if (head === 'for') {
      const { item, source: src, pipeline } = parseForHeader(inner);
      const body: Node[] = [];
      const node: ForNode = { kind: 'for', item, source: src, body };
      if (pipeline.length > 0) node.pipeline = pipeline;
      stack.push({ kind: 'for', node, body, start: seg.start, end: seg.end });
    } else if (head === 'elseif') {
      const t = top();
      if (t?.kind === 'if') {
        const body: Node[] = [];
        t.node.branches.push({ condition: parseCondition(rest), body });
        t.body = body;
      } else {
        asText(seg.raw);
      }
    } else if (head === 'else') {
      const t = top();
      if (t?.kind === 'if') {
        const body: Node[] = [];
        t.node.branches.push({ condition: null, body });
        t.body = body;
      } else if (t?.kind === 'for') {
        t.node.elseBody = [];
        t.body = t.node.elseBody;
      } else {
        asText(seg.raw);
      }
    } else if (head === '/if') {
      const t = top();
      if (t?.kind === 'if') {
        stack.pop();
        currentBody().push(t.node);
      } else {
        asText(seg.raw);
      }
    } else if (head === '/for') {
      const t = top();
      if (t?.kind === 'for') {
        stack.pop();
        currentBody().push(t.node);
      } else {
        asText(seg.raw);
      }
    } else if (head === '#priority' || head === '#mode') {
      const body: Node[] = [];
      const name = head.slice(1);
      const params = name === 'priority' ? { level: rest } : { name: rest };
      const node: DirectiveNode = { kind: 'directive', name, params, body };
      stack.push({ kind: 'directive', node, body, start: seg.start, end: seg.end });
    } else if (head === '#block') {
      currentBody().push({
        kind: 'directive',
        name: 'block',
        params: { actions: parseActions(rest) },
        body: [],
      });
    } else if (head === '/priority' || head === '/mode') {
      const t = top();
      if (t?.kind === 'directive' && t.node.name === head.slice(1)) {
        stack.pop();
        currentBody().push(t.node);
      } else {
        asText(seg.raw);
      }
    } else {
      // Unknown block (include) — deferred; keep as text.
      asText(seg.raw);
    }
  }

  while (stack.length > 0) {
    const open = stack.pop() as OpenBlock;
    const label = open.kind === 'directive' ? open.node.name : open.kind;
    const start = posAt(source, open.start);
    const end = posAt(source, open.end);
    diagnostics.push(
      makeDiagnostic(
        'ML001',
        `'{{${label}}}' is never closed. Add '{{/${label}}}'.`,
        rangeAt(start.line, start.col, end.line, end.col),
      ),
    );
    currentBody().push(open.node);
  }

  return { nodes: root, diagnostics };
}
