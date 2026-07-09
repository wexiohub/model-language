# model-language (Ruby)

Ruby bindings for [model-language](https://github.com/wexiohub/model-language) —
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

```ruby
require "model_language"

engine = ModelLanguage::Engine.new
out = engine.render(
  "Hi {{ user.name | default: 'there' }}!",
  data: { "user" => { "name" => "Vasyl" } }
)
puts out["text"] # => "Hi Vasyl!"
```

Directives embed machine-readable constraints in a prompt. They are stripped from
the rendered text and returned in `directives`:

```ruby
src = <<~SRC
  Help with billing.
  {{verify_before: payments}}
  {{identity: contact.email == payment.email}}
  Greet {{contact.first_name | default: "there"}}.
SRC

out = engine.render(
  src,
  data: { "contact" => { "first_name" => "Vasyl" } },
  schema: [
    { "path" => "contact.email",      "type" => "string" },
    { "path" => "contact.first_name", "type" => "string" },
  ]
)
puts out["text"]                             # => "Help with billing.\n\nGreet Vasyl."
puts out["directives"].map { |d| d["name"] } # => ["verify_before", "identity"]
```

- `render(template, data:, schema:, options:)` → `{"text", "warnings", "resolvedBranches", "directives", "tokenEstimate"}`
- `validate(template, schema:, options:)` → `{"diagnostics", "maxTokenEstimate"}`
- `parse(template)` → `{"ast", "diagnostics"}`

Never raises for template problems — they degrade to empty output plus a warning.
Pass `options: { "now" => epoch_ms }` for datetime filters.
