// Runs the shared conformance fixtures through the ModelLanguage NuGet library and
// exits non-zero on any mismatch (parity with the TypeScript engine).

using System.Text.Json.Nodes;
using ModelLanguage;

var casesDir = Environment.GetEnvironmentVariable("MODEL_LANGUAGE_CASES")
    ?? "../../../../conformance/cases";

using var engine = new Engine();

List<string> Codes(JsonNode? arr) =>
    (arr as JsonArray)?.Select(d => d?["code"]?.GetValue<string>() ?? "").Where(s => s.Length > 0).ToList()
    ?? new List<string>();
List<string> Strings(JsonNode? arr) =>
    (arr as JsonArray)?.Select(x => x?.GetValue<string>() ?? "").ToList() ?? new List<string>();
JsonNode Clone(JsonObject f, string key, JsonNode fallback) =>
    f.ContainsKey(key) ? f[key]!.DeepClone() : fallback;

int failures = 0, count = 0;
foreach (var path in Directory.GetFiles(casesDir, "*.json").OrderBy(p => p))
{
    var f = JsonNode.Parse(File.ReadAllText(path))!.AsObject();
    var name = f["name"]?.GetValue<string>() ?? "";
    var template = f["template"]?.GetValue<string>() ?? "";
    var expect = f["expect"]!.AsObject();
    count++;

    if (expect.ContainsKey("output"))
    {
        var options = new JsonObject();
        if (f.ContainsKey("now")) options["now"] = f["now"]!.DeepClone();
        if (f.ContainsKey("snippets")) options["snippets"] = f["snippets"]!.DeepClone();
        var res = engine.Render(template, Clone(f, "data", new JsonObject()),
                                Clone(f, "schema", new JsonArray()), options);
        if (res["text"]?.GetValue<string>() != expect["output"]!.GetValue<string>() ||
            !Codes(res["warnings"]).SequenceEqual(Strings(expect["warnings"])))
        {
            Console.Error.WriteLine($"FAIL render: {name}");
            failures++;
        }
    }

    if (expect.ContainsKey("diagnostics"))
    {
        var res = engine.Validate(template, Clone(f, "schema", new JsonArray()));
        var got = Codes(res["diagnostics"]);
        got.Sort();
        var want = Strings(expect["diagnostics"]);
        want.Sort();
        if (!got.SequenceEqual(want))
        {
            Console.Error.WriteLine($"FAIL validate: {name}");
            failures++;
        }
    }
}

Console.WriteLine($"{count} cases, {failures} failures");
return failures == 0 ? 0 : 1;
