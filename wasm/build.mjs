// Build `wasm/dist/model_language.wasm`: bundle the entry + engine into one
// self-running script (esbuild), then compile that to a self-contained WASI
// module with Javy (`javy build`). Run with `pnpm wasm:build` (needs `javy` on
// PATH — see `.github/workflows/wasm.yml` for the install step).

import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

await mkdir(here('./dist/'), { recursive: true });

await build({
  entryPoints: [here('./entry.ts')],
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  target: 'es2020',
  outfile: here('./dist/engine.js'),
});

execFileSync(
  'javy',
  ['build', here('./dist/engine.js'), '-o', here('./dist/model_language.wasm')],
  {
    stdio: 'inherit',
  },
);
console.log('wrote wasm/dist/model_language.wasm');
