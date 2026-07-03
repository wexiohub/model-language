// WebAssembly-component entry: the three engine operations, each as a
// JSON-string → JSON-string function matching `wit/world.wit`. This module is
// bundled (esbuild) and componentized (jco) into `model_language.wasm`.
//
// The prime directive holds across the boundary too: never trap. Any bad input
// or internal error becomes an `{ "error": string }` response, so a host in any
// language gets a value back rather than a crashed instance.

import {
  parse as parseTemplate,
  render as renderTemplate,
  validate as validateTemplate,
} from '../src/index';
import type { DataSnapshot, FieldSchema, RenderOptions, ValidateOptions } from '../src/types';

interface RenderRequest {
  template?: string;
  data?: DataSnapshot;
  schema?: FieldSchema;
  options?: RenderOptions;
}

interface ValidateRequest {
  template?: string;
  schema?: FieldSchema;
  options?: ValidateOptions;
}

interface ParseRequest {
  template?: string;
}

function fail(error: unknown): string {
  return JSON.stringify({ error: error instanceof Error ? error.message : String(error) });
}

export function render(request: string): string {
  try {
    const req = JSON.parse(request) as RenderRequest;
    const { ast } = parseTemplate(req.template ?? '');
    // The component has no ambient clock (clocks disabled), so pin `now` to a
    // deterministic default when the host omits it — the engine must never call
    // `Date.now()` inside the sandbox. Hosts pass `options.now` for datetime.
    const options: RenderOptions = { now: 0, ...(req.options ?? {}) };
    return JSON.stringify(renderTemplate(ast, req.data ?? {}, req.schema ?? [], options));
  } catch (error) {
    return fail(error);
  }
}

export function validate(request: string): string {
  try {
    const req = JSON.parse(request) as ValidateRequest;
    return JSON.stringify(
      validateTemplate(req.template ?? '', req.schema ?? [], req.options ?? {}),
    );
  } catch (error) {
    return fail(error);
  }
}

export function parse(request: string): string {
  try {
    const req = JSON.parse(request) as ParseRequest;
    return JSON.stringify(parseTemplate(req.template ?? ''));
  } catch (error) {
    return fail(error);
  }
}
