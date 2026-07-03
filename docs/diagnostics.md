# Diagnostics catalog

Every diagnostic the engine can emit. Codes are stable — tooling branches on
`code`, never on the human `message` (which the host localizes). Severities come
from the catalog in [`src/diagnostics/codes.ts`](../src/diagnostics/codes.ts).

## Phases

| Phase | Codes | Effect |
|---|---|---|
| Parse | `ML0xx` | Template can't be saved active; editor shows an inline error. |
| Typecheck | `ML1xx` (field/structure), `ML2xx` (type) | Errors block activation; warnings allow saving. |
| Render | `ML3xx` | Warnings only — never block, never throw. Degrade + record in the report. |

## Parse — `ML0xx`

| Code | Name | Severity | Prevents |
|---|---|---|---|
| `ML001` | unclosed-block | error | `{{if}}` without `{{/if}}` swallowing half the template |
| `ML002` | circular-include | error | snippet A → B → A infinite loop |

## Field & structure — `ML1xx`

| Code | Name | Severity | Prevents |
|---|---|---|---|
| `ML101` | unknown-field | error | `user.plann` typo → branch never fires ("bot ignores my rules") |
| `ML102` | unknown-filter | error | `\| currancy` typo |

## Type — `ML2xx`

| Code | Name | Severity | Prevents |
|---|---|---|---|
| `ML201` | type-mismatch | error | `user.mrr == "500"` (number vs string); non-number in arithmetic |
| `ML202` | unknown-enum-value | error | `plan == "premium"` when the enum has no such value |
| `ML203` | filter-type-mismatch | error | `user.name \| round` |
| `ML210` | missing-default | warning | nullable field interpolated without `\| default` → holes in the prompt |
| `ML211` | unreachable-branch | warning | `plan == "free"` nested inside `plan == "pro"` |
| `ML212` | contradiction | warning | two branches that can both fire give the LLM conflicting instructions |
| `ML213` | prompt-too-long | warning | worst-case render exceeds the token budget |
| `ML214` | date-raw-comparison | error | `created_at > "2024-01-01"` → forces `\| days_ago` / `\| date` |
| `ML220` | enum-is-array | error | `==` on a `multiEnum` → quickfix to `contains` |
| `ML221` | loop-var-shadowing | warning | inner loop reuses an outer loop's item name |

`ML210` (add `| default` to a nullable interpolation) and `ML213` (pass
`maxTokenEstimate` to `validate` — `validate` also returns the worst-case
`maxTokenEstimate`) are emitted today. `ML211`/`ML212` require branch-domain
flow analysis and are **not yet emitted**; the codes are reserved so tooling can
adopt them without a breaking change.

## Render — `ML3xx` (warnings only; never throws)

| Code | Name | Cause / degrade |
|---|---|---|
| `ML301` | empty-interpolation | `null`/`undefined` interpolated with no `\| default` → empty |
| `ML302` | object-interpolation | object interpolated → empty |
| `ML303` | dynamic-coercion-failed | `dynamic` field couldn't parse as a number → `undefined` |
| `ML304` | enum-drift | runtime enum value outside the declared set → equality checks false, raw value still interpolates |
| `ML305` | division-by-zero | `x / 0` → empty |
| `ML306` | arithmetic-non-number | `null`/invalid operand in arithmetic → result `undefined` (never `NaN`/`0`) |
| `ML310` | provider-failed | a data provider / async function timed out or errored → namespace/value `undefined` |

## Host-registered codes

Product-specific **policy** rules are registered by the host (not shipped in the
package) — for example blocking interpolation of a `private` field, or an info
note on a security-adjacent field. Register them with
[`registerRule`](./api.md#registerruledef). See
[types](./types/README.md) for the `private` flag.
