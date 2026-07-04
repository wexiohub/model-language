defmodule ConformanceTest do
  # Runs the shared conformance fixtures through the ModelLanguage host and checks
  # them against the same expectations the TypeScript runner uses — proving the
  # Elixir bridge is behaviourally identical to the canonical engine.
  use ExUnit.Case, async: false

  @cases_dir Path.expand("../../../conformance/cases", __DIR__)

  defp codes(list) when is_list(list), do: Enum.map(list, & &1["code"])

  test "conformance parity with TypeScript" do
    for path <- Path.wildcard(Path.join(@cases_dir, "*.json")) do
      f = File.read!(path) |> Jason.decode!()
      expect = f["expect"]
      template = Map.get(f, "template", "")

      if Map.has_key?(expect, "output") do
        options =
          %{}
          |> then(&if Map.has_key?(f, "now"), do: Map.put(&1, "now", f["now"]), else: &1)
          |> then(&if Map.has_key?(f, "snippets"), do: Map.put(&1, "snippets", f["snippets"]), else: &1)

        res =
          ModelLanguage.render(template,
            data: Map.get(f, "data", %{}),
            schema: Map.get(f, "schema", []),
            options: options
          )

        assert res["text"] == expect["output"], "output: #{f["name"]}"
        assert codes(res["warnings"]) == Map.get(expect, "warnings", []), "warnings: #{f["name"]}"
      end

      if Map.has_key?(expect, "diagnostics") do
        res = ModelLanguage.validate(template, schema: Map.get(f, "schema", []))
        got = res["diagnostics"] |> codes() |> Enum.sort()
        assert got == Enum.sort(expect["diagnostics"]), "diagnostics: #{f["name"]}"
      end
    end
  end
end
