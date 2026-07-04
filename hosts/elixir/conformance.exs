# Elixir host for the model-language WebAssembly module (wasmex). Runs the exact
# same engine as the TypeScript package: one JSON request in on the module's
# stdin, one JSON response out on its stdout. This script runs the shared
# conformance fixtures through the host and exits non-zero on any mismatch.

Mix.install([{:wasmex, "~> 0.14"}, {:jason, "~> 1.4"}])

defmodule Conformance do
  def wasm_path,
    do: System.get_env("MODEL_LANGUAGE_WASM") || "../../wasm/dist/model_language.wasm"

  def invoke(bytes, request) do
    {:ok, stdin} = Wasmex.Pipe.new()
    {:ok, stdout} = Wasmex.Pipe.new()
    Wasmex.Pipe.write(stdin, Jason.encode!(request))
    Wasmex.Pipe.seek(stdin, 0)

    wasi = %Wasmex.Wasi.WasiOptions{stdin: stdin, stdout: stdout}
    {:ok, pid} = Wasmex.start_link(%{bytes: bytes, wasi: wasi})
    # A clean WASI exit returns an error; the response is already written.
    Wasmex.call_function(pid, "_start", [])

    Wasmex.Pipe.seek(stdout, 0)
    Jason.decode!(Wasmex.Pipe.read(stdout))
  end

  def codes(list) when is_list(list), do: Enum.map(list, & &1["code"])
  def codes(_), do: []

  def run do
    bytes = File.read!(wasm_path())
    files = Path.wildcard("../../conformance/cases/*.json") |> Enum.sort()

    failures =
      Enum.reduce(files, 0, fn path, acc ->
        f = File.read!(path) |> Jason.decode!()
        template = Map.get(f, "template", "")
        expect = f["expect"]
        acc + check_output(bytes, f, template, expect) +
          check_diagnostics(bytes, f, template, expect)
      end)

    IO.puts("#{length(files)} cases, #{failures} failures")
    System.halt(if(failures == 0, do: 0, else: 1))
  end

  defp check_output(bytes, f, template, %{"output" => output} = expect) do
    options =
      %{}
      |> maybe_put("now", f)
      |> maybe_put("snippets", f)

    req = %{
      "op" => "render",
      "template" => template,
      "data" => Map.get(f, "data", %{}),
      "schema" => Map.get(f, "schema", []),
      "options" => options
    }

    res = invoke(bytes, req)

    if res["text"] == output and codes(res["warnings"]) == Map.get(expect, "warnings", []) do
      0
    else
      IO.puts(:stderr, "FAIL render: #{f["name"]}")
      1
    end
  end

  defp check_output(_, _, _, _), do: 0

  defp check_diagnostics(bytes, f, template, %{"diagnostics" => diags}) do
    req = %{
      "op" => "validate",
      "template" => template,
      "schema" => Map.get(f, "schema", []),
      "options" => %{}
    }

    got = invoke(bytes, req) |> Map.get("diagnostics") |> codes() |> Enum.sort()

    if got == Enum.sort(diags) do
      0
    else
      IO.puts(:stderr, "FAIL validate: #{f["name"]}")
      1
    end
  end

  defp check_diagnostics(_, _, _, _), do: 0

  defp maybe_put(map, key, source) do
    if Map.has_key?(source, key), do: Map.put(map, key, source[key]), else: map
  end
end

Conformance.run()
