// Java host for the model-language WebAssembly module (GraalWasm — SIMD-capable,
// distributed as Maven artifacts so it runs on a stock JDK 21+). Runs the exact
// same engine as the TypeScript package: one JSON request in on the module's
// stdin, one JSON response out on its stdout. This program runs the shared
// conformance fixtures through the host and exits non-zero on any mismatch.

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.io.ByteSequence;

public class Conformance {
    static final ObjectMapper M = new ObjectMapper();
    static byte[] wasm;

    public static void main(String[] args) throws Exception {
        String wasmPath = System.getenv().getOrDefault(
                "MODEL_LANGUAGE_WASM", "../../wasm/dist/model_language.wasm");
        wasm = Files.readAllBytes(new File(wasmPath).toPath());

        File[] files = new File("../../conformance/cases").listFiles((d, n) -> n.endsWith(".json"));
        Arrays.sort(files);

        int failures = 0, count = 0;
        for (File file : files) {
            JsonNode f = M.readTree(file);
            String name = f.path("name").asText("");
            String template = f.path("template").asText("");
            JsonNode expect = f.get("expect");
            count++;

            if (expect.has("output")) {
                ObjectNode options = M.createObjectNode();
                if (f.has("now")) options.set("now", f.get("now"));
                if (f.has("snippets")) options.set("snippets", f.get("snippets"));
                ObjectNode req = M.createObjectNode();
                req.put("op", "render");
                req.put("template", template);
                req.set("data", f.has("data") ? f.get("data") : M.createObjectNode());
                req.set("schema", f.has("schema") ? f.get("schema") : M.createArrayNode());
                req.set("options", options);

                JsonNode res = invoke(req);
                if (!res.path("text").asText("").equals(expect.get("output").asText())
                        || !codes(res.get("warnings")).equals(strings(expect.get("warnings")))) {
                    System.err.println("FAIL render: " + name);
                    failures++;
                }
            }

            if (expect.has("diagnostics")) {
                ObjectNode req = M.createObjectNode();
                req.put("op", "validate");
                req.put("template", template);
                req.set("schema", f.has("schema") ? f.get("schema") : M.createArrayNode());
                req.set("options", M.createObjectNode());

                JsonNode res = invoke(req);
                List<String> got = codes(res.get("diagnostics"));
                Collections.sort(got);
                List<String> want = strings(expect.get("diagnostics"));
                Collections.sort(want);
                if (!got.equals(want)) {
                    System.err.println("FAIL validate: " + name);
                    failures++;
                }
            }
        }

        System.out.println(count + " cases, " + failures + " failures");
        System.exit(failures == 0 ? 0 : 1);
    }

    static JsonNode invoke(ObjectNode request) throws Exception {
        byte[] body = M.writeValueAsBytes(request);
        var stdout = new ByteArrayOutputStream();
        try (Context context = Context.newBuilder("wasm")
                .option("wasm.Builtins", "wasi_snapshot_preview1")
                .in(new ByteArrayInputStream(body))
                .out(stdout)
                .build()) {
            Source source = Source.newBuilder("wasm", ByteSequence.create(wasm), "model_language").build();
            var result = context.eval(source);
            try {
                // eval() may return the module instance (exports as members) or the
                // `_start` function directly — handle both.
                if (result.hasMembers() && result.getMember("_start") != null) {
                    result.getMember("_start").execute();
                } else if (result.canExecute()) {
                    result.execute();
                }
            } catch (PolyglotException e) {
                // a clean WASI exit surfaces as an exit exception; the response is written
            }
        }
        return M.readTree(stdout.toByteArray());
    }

    static List<String> codes(JsonNode arr) {
        List<String> out = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode d : arr) {
                if (d.has("code")) out.add(d.get("code").asText());
            }
        }
        return out;
    }

    static List<String> strings(JsonNode arr) {
        List<String> out = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode s : arr) out.add(s.asText());
        }
        return out;
    }
}
