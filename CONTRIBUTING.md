# Contributing to model-language

Thanks for your interest! model-language is a typed, safe template language for
AI-agent prompts. The engine is **one** canonical TypeScript implementation
(`src/`); every language host runs that same engine compiled to WebAssembly — so
we never reimplement the language, and every host is guaranteed identical by a
shared conformance suite.

## Getting started

```sh
pnpm install
pnpm test          # vitest — golden + unit + fuzz + round-trip (100% coverage gate)
pnpm lint          # Biome
pnpm typecheck     # tsc --noEmit
pnpm build         # tsup → dist (ESM + CJS + .d.ts)
pnpm bench         # vitest bench
```

All four checks must pass. Coverage is a **hard 100% gate** (lines, branches,
functions, statements) enforced in CI.

## The conformance suite is the contract

[`conformance/cases/*.json`](./conformance) are language-neutral golden fixtures.
They are the cross-host contract: the TypeScript runner and **every** host
(Python, Go, Rust, Ruby, C#, C++, Elixir) run them on each build.

- Any change to rendering, validation, or parsing behavior **must** add or update
  a conformance fixture.
- Breaking an existing fixture is a **breaking change** (semver major/minor).

## Prime directive

`render()` never throws and never leaks template syntax; `parse()` always
recovers. Problems degrade to empty output plus a `warnings`/`diagnostics` entry.
Fuzz tests guard this — don't weaken it.

## Adding a language host

Hosts live in [`hosts/`](./hosts) and are all ~30 lines over the same pattern:
feed the JSON request on the module's stdin, read the JSON response from stdout
(see [`hosts/README.md`](./hosts/README.md)). A new host should:

1. embed or load `model_language.wasm`,
2. add a parity test that runs `conformance/cases/*.json`,
3. add a CI step to [`.github/workflows/wasm.yml`](./.github/workflows/wasm.yml).

## Pull requests

- Branch from `main`; keep PRs focused.
- [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
  `docs:`, `test:`, `chore:`, `style:`).
- Update [`CHANGELOG.md`](./CHANGELOG.md) for user-facing changes.
- CI (`CI` + `WASM bridge`) must be green.

## Reporting bugs & security

Open an issue for bugs. For security vulnerabilities, follow
[`SECURITY.md`](./SECURITY.md) (private reporting) — do not open a public issue.

By contributing, you agree your contributions are licensed under the project's
[MIT license](./LICENSE).
