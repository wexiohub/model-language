# ModelLanguage (C#)

.NET bindings for [model-language](https://github.com/wexiohub/model-language) —
a typed, safe template language for AI-agent prompts. Runs the exact same engine
as the JavaScript/TypeScript package via an **embedded** WebAssembly module:
byte-for-byte identical output, guaranteed by a shared conformance suite.

```csharp
using ModelLanguage;
using System.Text.Json.Nodes;

using var engine = new Engine();
var data = JsonNode.Parse("""{ "user": { "name": "Vasyl" } }""");
var res = engine.Render("Hi {{ user.name | default: \"there\" }}!", data);
Console.WriteLine(res["text"]); // Hi Vasyl!
```

- `Render(template, data?, schema?, options?)` → `{ text, warnings, resolvedBranches, directives, tokenEstimate }`
- `Validate(template, schema?, options?)` → `{ diagnostics, maxTokenEstimate }`
- `Parse(template)` → `{ ast, diagnostics }`

Never throws for template problems — they degrade to empty output plus a warning.
Pass `options.now` (epoch ms) for datetime filters.
