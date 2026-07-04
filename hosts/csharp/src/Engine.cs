// C# host for the model-language WebAssembly module. Runs the exact same engine
// as the JavaScript/TypeScript package: one JSON request in on the module's
// stdin, one JSON response out on its stdout. The module is embedded in the
// assembly, so the NuGet package is self-contained.

using System.Text.Json.Nodes;
using Wasmtime;

namespace ModelLanguage;

public sealed class Engine : IDisposable
{
    private readonly Wasmtime.Engine engine = new();
    private readonly Module module;
    private readonly Linker linker;
    private readonly string wasmPath;

    public Engine()
    {
        // WasiConfiguration + Module load from file paths, so extract the embedded
        // module to a temp file once for this engine's lifetime.
        wasmPath = Path.GetTempFileName();
        using (var res = typeof(Engine).Assembly.GetManifestResourceStream("ModelLanguage.model_language.wasm")
                         ?? throw new InvalidOperationException("embedded model_language.wasm not found"))
        using (var file = File.Create(wasmPath))
        {
            res.CopyTo(file);
        }

        module = Module.FromFile(engine, wasmPath);
        linker = new Linker(engine);
        linker.DefineWasi();
    }

    public JsonNode Render(string template, JsonNode? data = null, JsonNode? schema = null, JsonNode? options = null) =>
        Invoke(new JsonObject
        {
            ["op"] = "render",
            ["template"] = template,
            ["data"] = data ?? new JsonObject(),
            ["schema"] = schema ?? new JsonArray(),
            ["options"] = options ?? new JsonObject(),
        });

    public JsonNode Validate(string template, JsonNode? schema = null, JsonNode? options = null) =>
        Invoke(new JsonObject
        {
            ["op"] = "validate",
            ["template"] = template,
            ["schema"] = schema ?? new JsonArray(),
            ["options"] = options ?? new JsonObject(),
        });

    public JsonNode Parse(string template) =>
        Invoke(new JsonObject { ["op"] = "parse", ["template"] = template });

    private JsonNode Invoke(JsonObject request)
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

    public void Dispose()
    {
        module.Dispose();
        linker.Dispose();
        engine.Dispose();
        try { File.Delete(wasmPath); }
        catch { /* best-effort cleanup */ }
    }
}
