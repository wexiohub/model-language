# ModelLanguage (C#)

.NET bindings for [model-language](https://github.com/wexiohub/model-language) —
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

```csharp
using ModelLanguage;
using System.Text.Json.Nodes;

using var engine = new Engine();
var data = JsonNode.Parse("""{ "user": { "name": "Vasyl" } }""");
var res = engine.Render("Hi {{ user.name | default: \"there\" }}!", data);
Console.WriteLine(res["text"]); // Hi Vasyl!
```

Directives embed machine-readable constraints in a prompt. They are stripped from
the rendered text and returned in `directives`:

```csharp
var src = """
    Help with billing.
    {{verify_before: payments}}
    {{identity: contact.email == payment.email}}
    Greet {{contact.first_name | default: "there"}}.
    """;

var data = JsonNode.Parse("""{ "contact": { "first_name": "Vasyl" } }""");
var schema = JsonNode.Parse("""[
    { "path": "contact.email",      "type": "string" },
    { "path": "contact.first_name", "type": "string" }
]""");

var res = engine.Render(src, data, schema);
Console.WriteLine(res["text"]);
// Help with billing.
//
// Greet Vasyl.
// res["directives"] → [{"name":"verify_before",…}, {"name":"identity",…}]
```

- `Render(template, data?, schema?, options?)` → `{ text, warnings, resolvedBranches, directives, tokenEstimate }`
- `Validate(template, schema?, options?)` → `{ diagnostics, maxTokenEstimate }`
- `Parse(template)` → `{ ast, diagnostics }`

Never throws for template problems — they degrade to empty output plus a warning.
Pass `options.now` (epoch ms) for datetime filters.
