import { makeDiagnostic } from '../diagnostics/factory';
import type {
  Diagnostic,
  DirectiveSpec,
  FieldSchema,
  InlineDirectiveNode,
  Node,
  TemplateNode,
} from '../types';
import { parseDirectiveArg } from './spec';

function collectInline(nodes: Node[], out: InlineDirectiveNode[]): void {
  for (const n of nodes) {
    switch (n.kind) {
      case 'inlineDirective':
        out.push(n);
        break;
      case 'if':
        for (const b of n.branches) collectInline(b.body, out);
        break;
      case 'for':
        collectInline(n.body, out);
        if (n.elseBody) collectInline(n.elseBody, out);
        break;
      case 'directive':
        collectInline(n.body, out);
        break;
      default:
        break;
    }
  }
}

export function validateDirectives(
  ast: TemplateNode,
  directives: DirectiveSpec[],
  schema: FieldSchema,
): Diagnostic[] {
  const byName = new Map(directives.map((d) => [d.name, d]));
  const fieldPaths = new Set(schema.map((f) => f.path));
  const out: Diagnostic[] = [];
  const nodes: InlineDirectiveNode[] = [];
  collectInline(ast, nodes);

  for (const node of nodes) {
    const spec = byName.get(node.name);
    if (!spec) {
      out.push(makeDiagnostic('ML240', `Unknown directive "${node.name}".`, node.range));
      continue;
    }
    const res = parseDirectiveArg(node.argRaw, spec);
    if (!res.ok) {
      out.push(makeDiagnostic(res.code, `Invalid argument for "${node.name}".`, node.range));
      continue;
    }
    // Field cross-check: comparison operandType 'field' → left must be a known field.
    if (
      spec.arg?.kind === 'comparison' &&
      spec.arg.comparison?.operandType === 'field' &&
      typeof res.value === 'object' &&
      'left' in res.value
    ) {
      if (!fieldPaths.has(res.value.left)) {
        out.push(
          makeDiagnostic('ML101', `Unknown field "${res.value.left}".`, node.range, {
            fieldPath: res.value.left,
          }),
        );
      }
    }
  }
  return out;
}
