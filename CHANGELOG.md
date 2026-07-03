# Changelog

All notable changes to `@wexio/model-language` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). A change
that breaks any golden test case is a breaking change.

## [Unreleased]

### Added

- Project scaffold: TypeScript, Biome (lint/format), vitest, tsup build
  (ESM + CJS + `.d.ts`), CI, MIT license.
- Stable public type contract (`parse` / `serialize` / `validate` / `render` /
  `registerFilter` / `registerRule`) — see `src/types.ts`.
- Placeholder implementations that pass plain prose through unchanged (the real
  language lands across milestones 0.1 → 0.3).
