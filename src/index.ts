/**
 * `@wexio/model-language` — public entry point.
 *
 * ⚠️ SCAFFOLD (milestone 0.1 in progress). The type contract below is stable and
 * final; the implementations are placeholders. Plain prose passes through
 * unchanged so the package is importable and the smoke suite is green. The real
 * lexer / parser / typechecker / renderer land task-by-task in the 0.1
 * implementation plan (see the design spec in the backend-app repo).
 *
 * Prime directive, honored even by the stubs: `render()` NEVER throws and NEVER
 * leaks template syntax into its output.
 */

export * from './types';

import type {
  FieldSchema,
  FilterDef,
  LintRule,
  ParseResult,
  RenderResult,
  TemplateNode,
  ValidateOptions,
  ValidateResult,
  DataSnapshot,
} from './types';

const OPEN_TOKEN = '{{';

/** Rough token estimate (~4 chars/token) — refined in milestone 0.2. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Parse template source into an AST.
 *
 * SCAFFOLD: no ML constructs are recognized yet — any source becomes a single
 * text node (empty source → empty AST). Real lexing/parsing + error recovery:
 * milestone 0.1.
 */
export function parse(source: string): ParseResult {
  if (source.includes(OPEN_TOKEN)) {
    // TODO(0.1): real lexer + parser + recovery. Until then, keep the source
    // verbatim as text — never throw, never partially mangle.
  }
  const ast: TemplateNode = source.length > 0 ? [{ kind: 'text', value: source }] : [];
  return { ast, diagnostics: [] };
}

/**
 * Serialize an AST back to canonical template text.
 *
 * SCAFFOLD: text nodes only. Deterministic whitespace hygiene + full node
 * coverage: milestone 0.1. Invariant to preserve: `parse(serialize(ast)) ≡ ast`.
 */
export function serialize(ast: TemplateNode): string {
  return ast.map((node) => (node.kind === 'text' ? node.value : '')).join('');
}

/**
 * Validate template source against a field schema (the editor path).
 *
 * SCAFFOLD: returns the parse result with no typecheck diagnostics yet.
 * Typechecking, lint rules, and token budgeting: milestone 0.1+.
 */
export function validate(
  source: string,
  _schema: FieldSchema,
  _opts?: ValidateOptions,
): ValidateResult {
  const { ast, diagnostics } = parse(source);
  // TODO(0.1): typecheck against schema + run built-in and host-registered rules.
  return { ast, diagnostics, maxTokenEstimate: null };
}

/**
 * Render an AST against a typed data snapshot (the runtime path).
 *
 * SCAFFOLD: concatenates text nodes. Expression evaluation, branch resolution,
 * filters, and the ML3xx render-warning report: milestone 0.1+. This function
 * MUST NEVER throw.
 */
export function render(
  ast: TemplateNode,
  _snapshot: DataSnapshot,
  _schema: FieldSchema,
): RenderResult {
  const text = ast.map((node) => (node.kind === 'text' ? node.value : '')).join('');
  return { text, warnings: [], resolvedBranches: [], tokenEstimate: estimateTokens(text) };
}

const customFilters = new Map<string, FilterDef>();
const customRules: LintRule[] = [];

/** Register a host-supplied filter (e.g. a locale-aware `currency`). */
export function registerFilter(def: FilterDef): void {
  customFilters.set(def.name, def);
}

/** Register a host-supplied lint rule (e.g. private-field interpolation policy). */
export function registerRule(rule: LintRule): void {
  customRules.push(rule);
}
