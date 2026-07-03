/**
 * `@wexio/model-language` — public entry point.
 *
 * A typed, safe, compile-time-resolved template language for AI-agent prompts.
 * The engine is a pipeline of focused modules; this barrel exposes the stable
 * public surface. See `docs/` for the language reference and `docs/api.md` for
 * these functions.
 *
 * Engine map:
 *   parser/     source ↔ AST (lexer → parser → serializer)
 *   typecheck/  AST × schema → diagnostics (editor path)
 *   render/     AST × data → final string (runtime path — never throws)
 *   filters/    filter registry (+ registerFilter)
 *   rules/      lint-rule registry (+ registerRule)
 *   engine.ts   validate() composition root
 *
 * ⚠️ SCAFFOLD: the type contract is final; the language logic lands across
 * milestones 0.1 → 0.3 (see README "Roadmap"). Today plain prose passes
 * through unchanged and `render()` already honors the prime directive
 * (never throws, never leaks syntax).
 */

export * from './types';
export { parse, serialize } from './parser';
export { render } from './render';
export { validate } from './engine';
export { registerFilter } from './filters';
export { registerRule } from './rules';
