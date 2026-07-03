/**
 * Public type contract for `@wexio/model-language`.
 *
 * The host (e.g. a backend) fills in {@link FieldSchema} + {@link DataSnapshot};
 * this package imports nothing framework- or app-specific. Everything below is
 * stable API surface — Phases 2/3 (a GraphQL validation API, a Tiptap docJson
 * binding) wrap these shapes, they do not change them.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema (host-supplied)
// ─────────────────────────────────────────────────────────────────────────────

export type MLType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'array'
  | 'enum'
  | 'multiEnum'
  | 'object'
  | 'dynamic';

export interface FieldDef {
  /** Dot path, e.g. "user.lead_status", "user.custom.industry". */
  path: string;
  type: MLType;
  /** Value may be explicit `null` (present-but-empty) as opposed to missing. */
  nullable?: boolean;
  /** Closed value set for `enum` / `multiEnum`. */
  values?: string[];
  /** Item type for `array`. */
  items?: MLType;
  /** Interpolation blocked by policy (conditions still allowed). Host flag. */
  private?: boolean;
  /** Derived/computed field (editor shows an ƒ badge). Read-only. */
  computed?: boolean;
  /** Editor label — pass-through, never affects evaluation. */
  name?: string;
  /** Editor hover doc — pass-through. */
  description?: string;
}

export type FieldSchema = FieldDef[];

/** Nested plain JSON with TYPED values, built by the host from its data providers. */
export type DataSnapshot = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = 'error' | 'warning' | 'info';

/** 1-based lines and columns; `end` is exclusive. Maps 1:1 to editor markers. */
export interface Range {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface Quickfix {
  title: string;
  edits: TextEdit[];
}

export interface Diagnostic {
  /** Stable code, e.g. "ML220". FE branches on this, never on `message`. */
  code: string;
  severity: Severity;
  message: string;
  range: Range;
  fieldPath?: string;
  quickfixes?: Quickfix[];
}

/** Which `if` branches fired at render time — the "why did the bot say X?" trail. */
export interface Branch {
  line: number;
  condition: string;
  result: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// AST
// ─────────────────────────────────────────────────────────────────────────────

export type Node =
  | TextNode
  | InterpolationNode
  | IfNode
  | ForNode
  | IncludeNode
  | DirectiveNode
  | CommentNode;

export type TemplateNode = Node[];

export interface TextNode {
  kind: 'text';
  value: string;
}

export interface InterpolationNode {
  kind: 'interpolation';
  value: Expr;
  pipeline: Filter[];
}

export interface IfBranch {
  /** `null` for the `else` branch. */
  condition: Expr | null;
  body: Node[];
}

export interface IfNode {
  kind: 'if';
  branches: IfBranch[];
}

export interface ForNode {
  kind: 'for';
  item: string;
  source: Expr;
  body: Node[];
  elseBody?: Node[];
}

export interface IncludeNode {
  kind: 'include';
  name: string;
  params: Record<string, Expr>;
}

export interface DirectiveNode {
  kind: 'directive';
  /** "priority" | "mode" | "block" */
  name: string;
  params: Record<string, unknown>;
  body: Node[];
}

export interface CommentNode {
  kind: 'comment';
}

export interface Filter {
  name: string;
  args: Expr[];
}

export type Expr = PathExpr | LiteralExpr | BinaryExpr | LogicalExpr | NotExpr | ArithExpr;

export interface PathExpr {
  kind: 'path';
  path: string;
}

export interface LiteralExpr {
  kind: 'literal';
  value: string | number | boolean | null | undefined | unknown[];
}

export interface BinaryExpr {
  kind: 'binary';
  /** "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "contains" | "startsWith" | … */
  op: string;
  left: Expr;
  right: Expr;
}

export interface LogicalExpr {
  kind: 'logical';
  op: 'and' | 'or';
  left: Expr;
  right: Expr;
}

export interface NotExpr {
  kind: 'not';
  expr: Expr;
}

export interface ArithExpr {
  kind: 'arith';
  op: '+' | '-' | '*' | '/';
  left: Expr;
  right: Expr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Results & extensibility
// ─────────────────────────────────────────────────────────────────────────────

export interface ParseResult {
  ast: TemplateNode;
  diagnostics: Diagnostic[];
}

export interface ValidateResult {
  ast: TemplateNode;
  diagnostics: Diagnostic[];
  /** Worst-case rendered size (all branches maxed) for budgeting; null if unparseable. */
  maxTokenEstimate: number | null;
}

export interface RenderResult {
  text: string;
  warnings: Diagnostic[];
  resolvedBranches: Branch[];
  tokenEstimate: number;
}

export interface FilterDef {
  name: string;
  /** Elaborated with typed signatures in milestones 0.1/0.2. Must never throw. */
  apply: (input: unknown, args: unknown[]) => unknown;
}

export interface LintRule {
  code: string;
  check: (ast: TemplateNode, schema: FieldSchema) => Diagnostic[];
}

export interface ValidateOptions {
  /** Validate `#block` actions against a specific agent's action registry. */
  agentId?: string;
  /** Host-registered extra rules (e.g. private-field, verified-note policy). */
  rules?: LintRule[];
  /** Host-registered extra filters (e.g. locale-aware currency). */
  filters?: FilterDef[];
}
