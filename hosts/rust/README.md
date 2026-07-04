# model-language (Rust)

Rust host for [model-language](https://github.com/wexiohub/model-language) — a
typed, safe template language for AI-agent prompts. Runs the exact same engine as
the JavaScript/TypeScript package via an **embedded** WebAssembly module (nothing
to ship alongside the crate): byte-for-byte identical output, guaranteed by a
shared conformance suite.

```rust
use model_language::EngineHost;
use serde_json::json;

let engine = EngineHost::new()?;
let out = engine.render(
    "Hi {{ user.name | default: \"there\" }}!",
    json!({ "user": { "name": "Vasyl" } }),
    json!([]),
    json!({}),
)?;
assert_eq!(out["text"], "Hi Vasyl!");
```

- `render(template, data, schema, options)` → `{ text, warnings, resolvedBranches, directives, tokenEstimate }`
- `validate(template, schema, options)` → `{ diagnostics, maxTokenEstimate }`
- `parse(template)` → `{ ast, diagnostics }`

Never panics on template problems — they degrade to empty output plus a warning.
Pass `options.now` (epoch ms) for datetime filters (the sandbox has no clock).
