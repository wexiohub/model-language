// Javy stdio entry: read ONE JSON request from stdin, dispatch to the engine,
// write ONE JSON response to stdout. Bundled with esbuild, then compiled to a
// self-contained WASI module with Javy (`javy build`). The prime directive holds
// across the boundary: never trap — any bad input becomes `{ "error": string }`.
//
// Protocol (stdin → stdout):
//   { "op": "render",   template, data?, schema?, options? } -> RenderResult
//   { "op": "validate", template, schema?, options? }        -> ValidateResult
//   { "op": "parse",    template }                            -> ParseResult

import {
  parse as parseTemplate,
  render as renderTemplate,
  validate as validateTemplate,
} from '../src/index';
import type { DataSnapshot, FieldSchema, RenderOptions, ValidateOptions } from '../src/types';

declare const Javy: {
  IO: {
    readSync(fd: number, buffer: Uint8Array): number;
    writeSync(fd: number, buffer: Uint8Array): number;
  };
};

interface EngineRequest {
  op?: string;
  template?: string;
  data?: DataSnapshot;
  schema?: FieldSchema;
  options?: RenderOptions & ValidateOptions;
}

function readInput(): unknown {
  const chunks: Uint8Array[] = [];
  let total = 0;
  let bytesRead = 0;
  do {
    const buffer = new Uint8Array(1024);
    bytesRead = Javy.IO.readSync(0, buffer);
    if (bytesRead > 0) {
      chunks.push(buffer.subarray(0, bytesRead));
      total += bytesRead;
    }
  } while (bytesRead > 0);

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function writeOutput(value: unknown): void {
  Javy.IO.writeSync(1, new TextEncoder().encode(JSON.stringify(value)));
}

function handle(req: EngineRequest): unknown {
  switch (req.op) {
    case 'render': {
      const { ast } = parseTemplate(req.template ?? '');
      // The sandbox has no ambient clock; pin `now` unless the host passes one.
      const options: RenderOptions = { now: 0, ...(req.options ?? {}) };
      return renderTemplate(ast, req.data ?? {}, req.schema ?? [], options);
    }
    case 'validate':
      return validateTemplate(req.template ?? '', req.schema ?? [], req.options ?? {});
    case 'parse':
      return parseTemplate(req.template ?? '');
    default:
      return { error: `unknown op: ${String(req.op)}` };
  }
}

try {
  writeOutput(handle(readInput() as EngineRequest));
} catch (error) {
  writeOutput({ error: error instanceof Error ? error.message : String(error) });
}
