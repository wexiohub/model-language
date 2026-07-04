# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name = "model-language"
  spec.version = "1.0.0"
  spec.summary = "A typed, safe template language for AI-agent prompts (WebAssembly-backed)."
  spec.description = "Runs the exact same engine as the JavaScript/TypeScript package via an " \
                     "embedded WebAssembly module — byte-for-byte identical output, guaranteed " \
                     "by a shared conformance suite."
  spec.authors = ["Wexio"]
  spec.license = "MIT"
  spec.homepage = "https://github.com/wexiohub/model-language"
  spec.required_ruby_version = ">= 3.0"

  spec.files = Dir["lib/**/*.rb"] + ["lib/model_language.wasm", "README.md"]
  spec.require_paths = ["lib"]

  spec.add_dependency "wasmtime", ">= 30.0"

  spec.metadata = {
    "source_code_uri" => "https://github.com/wexiohub/model-language",
    "rubygems_mfa_required" => "true"
  }
end
