# model-language (Rust)

Rust host for [model-language](https://github.com/wexiohub/model-language) — a
typed, safe template language for AI-agent prompts. Runs the exact same engine as
the JavaScript/TypeScript package via an **embedded** WebAssembly module (nothing
to ship alongside the crate): byte-for-byte identical output, guaranteed by a
shared conformance suite.

**▶ [Live demo](https://ml.wexio.io)** — try the language in a Tiptap editor
(live validation, autocomplete, real-time render), powered by the same engine.

Filters format values — dates, numbers, text:

```text
{{ user.created_at | date: "MMM D, YYYY" }}            →  Jul 5, 2026
{{ user.created_at | date: "h:mm A", "Europe/Kyiv" }}  →  5:37 PM
{{ user.last_seen  | time_ago }}                       →  3 days ago
```

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
