// C# host for the model-language WebAssembly module. Runs the exact same engine
// as the TypeScript package: one JSON request in on the module's stdin, one JSON
// response out on its stdout. This program runs the shared conformance fixtures
// through the host and exits non-zero on any mismatch (parity with TypeScript).

using System.Text.Json.Nodes;
using Wasmtime;

var wasmPath = Environment.GetEnvironmentVariable("MODEL_LANGUAGE_WASM")
    ?? "../../wasm/dist/model_language.wasm";
var casesDir = Environment.GetEnvironmentVariable("MODEL_LANGUAGE_CASES")
    ?? "../../conformance/cases";

using var engine = new Engine();
using var module = Module.FromFile(engine, wasmPath);
using var linker = new Linker(engine);
linker.DefineWasi();

JsonNode Invoke(JsonObject request)
{
    var inPath = Path.GetTempFileName();
    var outPath = Path.GetTempFileName();
    File.WriteAllText(inPath, request.ToJsonString());
    using (var store = new Store(engine))
    {
        store.SetWasiConfiguration(new WasiConfiguration()
            .WithStandardInput(inPath)
            .WithStandardOutput(outPath));
        var instance = linker.Instantiate(store, module);
        try { instance.GetAction("_start")?.Invoke(); }
        catch { /* a clean WASI exit surfaces as an exception; the response is written */ }
    }
    var text = File.ReadAllText(outPath);
    File.Delete(inPath);
    File.Delete(outPath);
    return JsonNode.Parse(text)!;
}

// warnings/diagnostics in a RESULT are objects with a "code"; in a FIXTURE they are plain strings.
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
        var res = Invoke(new JsonObject
        {
            ["op"] = "render",
            ["template"] = template,
            ["data"] = Clone(f, "data", new JsonObject()),
            ["schema"] = Clone(f, "schema", new JsonArray()),
            ["options"] = options,
        });
        var text = res["text"]?.GetValue<string>() ?? "";
        if (text != expect["output"]!.GetValue<string>() ||
            !Codes(res["warnings"]).SequenceEqual(Strings(expect["warnings"])))
        {
            Console.Error.WriteLine($"FAIL render: {name}");
            failures++;
        }
    }

    if (expect.ContainsKey("diagnostics"))
    {
        var res = Invoke(new JsonObject
        {
            ["op"] = "validate",
            ["template"] = template,
            ["schema"] = Clone(f, "schema", new JsonArray()),
            ["options"] = new JsonObject(),
        });
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
