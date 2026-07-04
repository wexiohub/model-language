//! Runs the shared conformance fixtures through the Rust host and checks them
//! against the same expectations the TypeScript runner uses — proving the Rust
//! bridge is behaviourally identical to the canonical engine.

use std::fs;
use std::path::PathBuf;

use model_language::EngineHost;
use serde_json::Value;

fn host() -> EngineHost {
    EngineHost::new().expect("load module")
}

fn codes(v: &Value) -> Vec<String> {
    v.as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|d| d.get("code").and_then(Value::as_str).map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

#[test]
fn conformance() {
    let host = host();
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../conformance/cases");

    for entry in fs::read_dir(&dir).expect("read cases") {
        let path = entry.unwrap().path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let f: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        let name = f["name"].as_str().unwrap_or("");
        let template = f["template"].as_str().unwrap_or("");
        let expect = &f["expect"];

        if let Some(output) = expect.get("output").and_then(Value::as_str) {
            let mut options = serde_json::Map::new();
            if let Some(now) = f.get("now") {
                options.insert("now".into(), now.clone());
            }
            if let Some(snippets) = f.get("snippets") {
                options.insert("snippets".into(), snippets.clone());
            }
            let data = f.get("data").cloned().unwrap_or_else(|| json_object());
            let schema = f.get("schema").cloned().unwrap_or_else(|| Value::Array(vec![]));
            let res = host
                .render(template, data, schema, Value::Object(options))
                .unwrap();
            assert_eq!(res["text"].as_str().unwrap_or(""), output, "output: {name}");

            let want: Vec<String> = expect
                .get("warnings")
                .and_then(Value::as_array)
                .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
                .unwrap_or_default();
            assert_eq!(codes(&res["warnings"]), want, "warnings: {name}");
        }

        if let Some(diags) = expect.get("diagnostics").and_then(Value::as_array) {
            let schema = f.get("schema").cloned().unwrap_or_else(|| Value::Array(vec![]));
            let res = host.validate(template, schema, Value::Null).unwrap();
            let mut got = codes(&res["diagnostics"]);
            got.sort();
            let mut want: Vec<String> =
                diags.iter().filter_map(|x| x.as_str().map(String::from)).collect();
            want.sort();
            assert_eq!(got, want, "diagnostics: {name}");
        }
    }
}

fn json_object() -> Value {
    Value::Object(serde_json::Map::new())
}
