# model_language (Elixir)

Elixir bindings for [model-language](https://github.com/wexiohub/model-language) —
a typed, safe template language for AI-agent prompts. Runs the exact same engine
as the JavaScript/TypeScript package via an **embedded** WebAssembly module:
byte-for-byte identical output, guaranteed by a shared conformance suite.

**▶ [Live demo](https://ml.wexio.io)** — try the language in a Tiptap editor
(live validation, autocomplete, real-time render), powered by the same engine.

Filters format values — dates, numbers, text:

```text
{{ user.created_at | date: "MMM D, YYYY" }}            →  Jul 5, 2026
{{ user.created_at | date: "h:mm A", "Europe/Kyiv" }}  →  5:37 PM
{{ user.last_seen  | time_ago }}                       →  3 days ago
```

```elixir
# mix.exs
def deps, do: [{:model_language, "~> 1.0"}]
```

```elixir
ModelLanguage.render(
  "Hi {{ user.name | default: 'there' }}!",
  data: %{"user" => %{"name" => "Vasyl"}}
)["text"]
# => "Hi Vasyl!"
```

- `render(template, data:, schema:, options:)` → `%{"text", "warnings", "resolvedBranches", "directives", "tokenEstimate"}`
- `validate(template, schema:, options:)` → `%{"diagnostics", "maxTokenEstimate"}`
- `parse(template)` → `%{"ast", "diagnostics"}`

Never raises for template problems — they degrade to empty output plus a warning.
Pass `options: %{"now" => epoch_ms}` for datetime filters.
