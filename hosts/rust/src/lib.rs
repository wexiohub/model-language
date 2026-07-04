//! Rust host for the model-language WebAssembly module. It runs the exact same
//! engine as the TypeScript package: one JSON request in on the module's stdin,
//! one JSON response out on its stdout. Same input, same output.

use std::sync::Mutex;

use anyhow::Result;
use serde_json::{json, Value};
use wasmtime::{Engine, Linker, Module, Store};
use wasmtime_wasi::pipe::{MemoryInputPipe, MemoryOutputPipe};
use wasmtime_wasi::preview1::{self, WasiP1Ctx};
use wasmtime_wasi::WasiCtx;

/// The model-language WebAssembly module, embedded at build time so the crate is
/// self-contained (no files to ship alongside it).
static WASM: &[u8] = include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/model_language.wasm"));

/// A compiled module. Safe for concurrent use; calls are serialized so each runs
/// in its own fresh WASI store.
pub struct EngineHost {
    engine: Engine,
    module: Module,
    lock: Mutex<()>,
}

impl EngineHost {
    /// Load the embedded model-language module.
    pub fn new() -> Result<Self> {
        let engine = Engine::default();
        let module = Module::new(&engine, WASM)?;
        Ok(Self {
            engine,
            module,
            lock: Mutex::new(()),
        })
    }

    fn invoke(&self, request: &Value) -> Result<Value> {
        let body = serde_json::to_vec(request)?;
        let _guard = self.lock.lock().unwrap();

        let stdin = MemoryInputPipe::new(body);
        let stdout = MemoryOutputPipe::new(1 << 20);
        let wasi: WasiP1Ctx = WasiCtx::builder().stdin(stdin).stdout(stdout.clone()).build_p1();

        let mut store = Store::new(&self.engine, wasi);
        let mut linker: Linker<WasiP1Ctx> = Linker::new(&self.engine);
        preview1::add_to_linker_sync(&mut linker, |s| s)?;

        let instance = linker.instantiate(&mut store, &self.module)?;
        let start = instance.get_typed_func::<(), ()>(&mut store, "_start")?;
        // A clean WASI exit surfaces as an error; the response is already written.
        let _ = start.call(&mut store, ());
        drop(store);

        Ok(serde_json::from_slice(&stdout.contents())?)
    }

    pub fn render(&self, template: &str, data: Value, schema: Value, options: Value) -> Result<Value> {
        self.invoke(&json!({
            "op": "render", "template": template,
            "data": data, "schema": schema, "options": options,
        }))
    }

    pub fn validate(&self, template: &str, schema: Value, options: Value) -> Result<Value> {
        self.invoke(&json!({
            "op": "validate", "template": template, "schema": schema, "options": options,
        }))
    }

    pub fn parse(&self, template: &str) -> Result<Value> {
        self.invoke(&json!({ "op": "parse", "template": template }))
    }
}
