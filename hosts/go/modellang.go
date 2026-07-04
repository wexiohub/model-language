// Package modellang hosts the model-language WebAssembly module from Go. It runs
// the exact same engine as the TypeScript package: one JSON request in on the
// module's stdin, one JSON response out on its stdout. Same input, same output.
package modellang

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/bytecodealliance/wasmtime-go/v46"
)

// Engine holds a compiled module. It is safe for concurrent use; calls are
// serialized so each runs in its own fresh WASI store.
type Engine struct {
	engine *wasmtime.Engine
	module *wasmtime.Module
	mu     sync.Mutex
}

// New compiles the module at wasmPath (e.g. wasm/dist/model_language.wasm).
func New(wasmPath string) (*Engine, error) {
	engine := wasmtime.NewEngine()
	module, err := wasmtime.NewModuleFromFile(engine, wasmPath)
	if err != nil {
		return nil, err
	}
	return &Engine{engine: engine, module: module}, nil
}

func (e *Engine) invoke(request map[string]any) (map[string]any, error) {
	body, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	dir, err := os.MkdirTemp("", "modellang")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	inPath := filepath.Join(dir, "in.json")
	outPath := filepath.Join(dir, "out.json")
	if err := os.WriteFile(inPath, body, 0o600); err != nil {
		return nil, err
	}
	if err := os.WriteFile(outPath, nil, 0o600); err != nil {
		return nil, err
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	store := wasmtime.NewStore(e.engine)
	wasi := wasmtime.NewWasiConfig()
	wasi.SetStdinFile(inPath)
	wasi.SetStdoutFile(outPath)
	store.SetWasi(wasi)

	linker := wasmtime.NewLinker(e.engine)
	if err := linker.DefineWasi(); err != nil {
		return nil, err
	}
	instance, err := linker.Instantiate(store, e.module)
	if err != nil {
		return nil, err
	}
	start := instance.GetFunc(store, "_start")
	if start == nil {
		return nil, fmt.Errorf("module has no _start export")
	}

	// A clean WASI exit surfaces as an error; if we got a response, that's success.
	_, callErr := start.Call(store)
	out, readErr := os.ReadFile(outPath)
	if readErr != nil {
		return nil, readErr
	}
	if len(out) == 0 {
		if callErr != nil {
			return nil, callErr
		}
		return nil, fmt.Errorf("empty response")
	}

	var result map[string]any
	if err := json.Unmarshal(out, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// Render renders template against data. data/schema/options may be nil (the
// module defaults a null field to its empty value).
func (e *Engine) Render(template string, data map[string]any, schema []map[string]any, options map[string]any) (map[string]any, error) {
	return e.invoke(map[string]any{
		"op":       "render",
		"template": template,
		"data":     data,
		"schema":   schema,
		"options":  options,
	})
}

// Validate type-checks template against schema. schema/options may be nil.
func (e *Engine) Validate(template string, schema []map[string]any, options map[string]any) (map[string]any, error) {
	return e.invoke(map[string]any{
		"op":       "validate",
		"template": template,
		"schema":   schema,
		"options":  options,
	})
}

// Parse parses template to its AST.
func (e *Engine) Parse(template string) (map[string]any, error) {
	return e.invoke(map[string]any{"op": "parse", "template": template})
}
