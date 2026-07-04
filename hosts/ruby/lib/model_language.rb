# frozen_string_literal: true

# Ruby host for the model-language WebAssembly module. Runs the exact same engine
# as the TypeScript package: one JSON request in on the module's stdin, one JSON
# response out on its stdout. Same input, same output.

require "wasmtime"
require "json"
require "tempfile"

module ModelLanguage
  class Engine
    def initialize(wasm_path = nil)
      wasm_path ||= ENV["MODEL_LANGUAGE_WASM"] || bundled_wasm ||
                    File.expand_path("../../../wasm/dist/model_language.wasm", __dir__)
      @engine = Wasmtime::Engine.new
      @module = Wasmtime::Module.from_file(@engine, wasm_path)
      @linker = Wasmtime::Linker.new(@engine)
      Wasmtime::WASI::P1.add_to_linker_sync(@linker)
    end

    def render(template, data: {}, schema: [], options: {})
      invoke("op" => "render", "template" => template, "data" => data,
             "schema" => schema, "options" => options)
    end

    def validate(template, schema: [], options: {})
      invoke("op" => "validate", "template" => template, "schema" => schema, "options" => options)
    end

    def parse(template)
      invoke("op" => "parse", "template" => template)
    end

    private

    def invoke(request)
      Tempfile.create("model-language") do |out|
        config = Wasmtime::WasiConfig.new
                 .set_stdin_string(JSON.dump(request))
                 .set_stdout_file(out.path)
        store = Wasmtime::Store.new(@engine, wasi_p1_config: config)
        instance = @linker.instantiate(store, @module)

        error = nil
        begin
          instance.invoke("_start")
        rescue StandardError => e
          error = e # a clean WASI exit surfaces as an error; the response is written
        end

        content = File.read(out.path)
        raise error if content.empty? && error

        JSON.parse(content)
      end
    end

    def bundled_wasm
      path = File.expand_path("model_language.wasm", __dir__)
      File.exist?(path) ? path : nil
    end
  end
end
