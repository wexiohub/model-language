# Conformance suite

Language-neutral golden fixtures that **define** Model Language behavior. This
package's tests run them; any other-language port (Python, Go, Java, Ruby,
Elixir, …) runs the exact same files and passes iff it behaves identically. The
fixtures — not any one implementation — are the contract.

## Fixture format (`cases/*.json`)

```json
{
  "name": "human-readable case name",
  "template": "CSM: {{user.csm.name | default: \"our team\"}}",
  "schema": [{ "path": "user.csm", "type": "object", "nullable": true }],
  "data": { "user": { "csm": null } },
  "expect": {
    "output": "CSM: our team",
    "warnings": []
  }
}
```

- `template` — Model Language source.
- `schema` — a `FieldSchema` (array of `FieldDef`).
- `data` — the typed data snapshot to render against.
- `expect.output` — the exact rendered string (omit for a validate-only case).
- `expect.warnings` — the ordered list of render diagnostic **codes** (e.g.
  `["ML301"]`), empty when the render is clean.
- `expect.diagnostics` — the set of **validate** (typecheck) codes the template
  should produce (e.g. `["ML220"]`), for lint-rule cases. Order-independent.

A fixture may assert render (`output` + `warnings`), validate (`diagnostics`),
or both. `data` is optional for validate-only cases.

## Running (this package)

`test/golden/conformance.test.ts` loads every `cases/*.json` and asserts
`render(parse(template), data, schema)` matches `expect`. Adding a `.json` file
adds a case to every implementation at once.

## For port authors

Read each `cases/*.json`, run your engine, and assert `output` + `warnings`.
Scope grows with the language: 0.1a covers interpolation; conditionals, loops,
filters, and typecheck diagnostics arrive in later milestones as more fixtures.
