# Model Language — Documentation

The complete reference for `@wexio/model-language`: a typed, safe,
compile-time-resolved template language for AI-agent prompts.

> **Implementation status.** The language is documented here in full; the engine
> ships it across milestones. Each page tags features with the milestone that
> delivers them: **0.1** (variables, conditions), **0.2** (loops, filters,
> arithmetic), **0.3** (includes, directives, comments). See the
> [roadmap](../README.md#roadmap).

## Start here

- [Getting started](./getting-started.md) — install, your first template, the
  editor vs runtime paths.
- [Public API](./api.md) — `parse` · `serialize` · `validate` · `render` ·
  `registerFilter` · `registerRule`, fully documented.

## The language

- [Variables & interpolation](./variables.md) — `{{path | filter}}`, safe
  navigation, stringification.
- [Types](./types/README.md) — the type system and the operator × type matrix.
  - [`null` vs `undefined` & `exists`](./types/null-vs-undefined.md)
- [Conditionals](./conditionals.md) — `if / elseif / else`, operators, logic,
  truthiness.
- [Loops](./loops.md) — `for`, loop locals, empty-state `else`.
- [Math & functions](./functions.md) — arithmetic, `calculate()`, type safety,
  `registerFunction`, and the async execution model.
- [Filters](./filters/README.md) — the typed pipeline functions.
- [Directives, includes & comments](./directives.md) — `#priority`, `#mode`,
  `#block`, `include`, `{# … #}`.

## Reference

- [Diagnostics catalog](./diagnostics.md) — every `ML###` code: cause, message,
  fix.
- [Performance](./performance.md) — parse-once/render-many, the hot path, footprint.
- [Portability](./portability.md) — using ML from Python/Go/etc. via the
  conformance suite, a service, or a native port.

## Examples

- [`/examples`](../examples/) — runnable template files with their schema,
  data, and expected output.
