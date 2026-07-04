# frozen_string_literal: true

# Runs the shared conformance fixtures through the Ruby host and checks them
# against the same expectations the TypeScript runner uses — proving the Ruby
# bridge is behaviourally identical to the canonical engine.

require "minitest/autorun"
require "json"
require_relative "../lib/model_language"

class ConformanceTest < Minitest::Test
  CASES_DIR = File.expand_path("../../../conformance/cases", __dir__)
  ENGINE = ModelLanguage::Engine.new

  Dir[File.join(CASES_DIR, "*.json")].sort.each do |path|
    fixture = JSON.parse(File.read(path))
    method_name = "test_#{fixture["name"].gsub(/\W+/, "_")}"

    define_method(method_name) do
      expect = fixture["expect"]

      if expect.key?("output")
        options = {}
        options["now"] = fixture["now"] if fixture.key?("now")
        options["snippets"] = fixture["snippets"] if fixture.key?("snippets")
        res = ENGINE.render(fixture["template"], data: fixture.fetch("data", {}),
                                                 schema: fixture["schema"], options: options)
        assert_equal expect["output"], res["text"]
        assert_equal expect.fetch("warnings", []), res["warnings"].map { |w| w["code"] }
      end

      if expect.key?("diagnostics")
        res = ENGINE.validate(fixture["template"], schema: fixture["schema"])
        assert_equal expect["diagnostics"].sort, res["diagnostics"].map { |d| d["code"] }.sort
      end
    end
  end
end
