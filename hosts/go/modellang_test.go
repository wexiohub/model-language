package modellang

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"testing"
)

// Runs the shared conformance fixtures through the Go host and checks them
// against the same expectations the TypeScript runner uses — proving the Go
// bridge is behaviourally identical to the canonical engine.

type fixture struct {
	Name     string           `json:"name"`
	Template string           `json:"template"`
	Schema   []map[string]any `json:"schema"`
	Data     map[string]any   `json:"data"`
	Now      *float64         `json:"now"`
	Snippets map[string]any   `json:"snippets"`
	Expect   struct {
		Output      *string  `json:"output"`
		Warnings    []string `json:"warnings"`
		Diagnostics []string `json:"diagnostics"`
	} `json:"expect"`
}

func loadEngine(t *testing.T) *Engine {
	t.Helper()
	wasm := os.Getenv("MODEL_LANGUAGE_WASM")
	if wasm == "" {
		wasm = filepath.Join("..", "..", "wasm", "dist", "model_language.wasm")
	}
	e, err := New(wasm)
	if err != nil {
		t.Fatalf("load module: %v", err)
	}
	return e
}

func codes(v any) []string {
	out := []string{}
	arr, ok := v.([]any)
	if !ok {
		return out
	}
	for _, item := range arr {
		if m, ok := item.(map[string]any); ok {
			if c, ok := m["code"].(string); ok {
				out = append(out, c)
			}
		}
	}
	return out
}

func TestConformance(t *testing.T) {
	e := loadEngine(t)
	dir := filepath.Join("..", "..", "conformance", "cases")
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read cases: %v", err)
	}

	for _, entry := range entries {
		if filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			t.Fatalf("read %s: %v", entry.Name(), err)
		}
		var f fixture
		if err := json.Unmarshal(raw, &f); err != nil {
			t.Fatalf("parse %s: %v", entry.Name(), err)
		}

		t.Run(f.Name, func(t *testing.T) {
			if f.Expect.Output != nil {
				options := map[string]any{}
				if f.Now != nil {
					options["now"] = *f.Now
				}
				if f.Snippets != nil {
					options["snippets"] = f.Snippets
				}
				res, err := e.Render(f.Template, f.Data, f.Schema, options)
				if err != nil {
					t.Fatalf("render: %v", err)
				}
				if got, _ := res["text"].(string); got != *f.Expect.Output {
					t.Fatalf("output = %q, want %q", got, *f.Expect.Output)
				}
				want := f.Expect.Warnings
				if want == nil {
					want = []string{}
				}
				if got := codes(res["warnings"]); !reflect.DeepEqual(got, want) {
					t.Fatalf("warnings = %v, want %v", got, want)
				}
			}

			if f.Expect.Diagnostics != nil {
				res, err := e.Validate(f.Template, f.Schema, nil)
				if err != nil {
					t.Fatalf("validate: %v", err)
				}
				got := codes(res["diagnostics"])
				sort.Strings(got)
				want := append([]string{}, f.Expect.Diagnostics...)
				sort.Strings(want)
				if !reflect.DeepEqual(got, want) {
					t.Fatalf("diagnostics = %v, want %v", got, want)
				}
			}
		})
	}
}
