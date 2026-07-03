// Build `wasm/dist/model_language.wasm`: bundle the entry + engine into one ESM
// module (esbuild), then compile that to a WebAssembly component (jco /
// componentize-js) against `wit/world.wit`. Run with `pnpm wasm:build`.
//
// All ambient capabilities are disabled — the engine is pure, so the component
// has no WASI imports and any host can instantiate it with zero wiring.

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { componentize } from '@bytecodealliance/componentize-js';
import { build } from 'esbuild';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

await mkdir(here('./dist/'), { recursive: true });

await build({
  entryPoints: [here('./entry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  outfile: here('./dist/engine.js'),
});

const { component } = await componentize({
  sourcePath: here('./dist/engine.js'),
  witPath: here('./wit/world.wit'),
  worldName: 'engine',
  disableFeatures: ['random', 'stdio', 'clocks', 'http', 'fetch-event'],
});

await writeFile(here('./dist/model_language.wasm'), component);
console.log(`wrote wasm/dist/model_language.wasm (${component.length} bytes)`);
