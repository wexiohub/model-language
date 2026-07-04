# model-language (Ruby)

Ruby bindings for [model-language](https://github.com/wexiohub/model-language) —
a typed, safe template language for AI-agent prompts. Runs the exact same engine
as the JavaScript/TypeScript package via an **embedded** WebAssembly module:
byte-for-byte identical output, guaranteed by a shared conformance suite.

```ruby
require "model_language"

engine = ModelLanguage::Engine.new
out = engine.render(
  "Hi {{ user.name | default: 'there' }}!",
  data: { "user" => { "name" => "Vasyl" } }
)
puts out["text"] # => "Hi Vasyl!"
```

- `render(template, data:, schema:, options:)` → `{"text", "warnings", "resolvedBranches", "directives", "tokenEstimate"}`
- `validate(template, schema:, options:)` → `{"diagnostics", "maxTokenEstimate"}`
- `parse(template)` → `{"ast", "diagnostics"}`

Never raises for template problems — they degrade to empty output plus a warning.
Pass `options: { "now" => epoch_ms }` for datetime filters.
