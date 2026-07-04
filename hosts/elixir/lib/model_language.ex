defmodule ModelLanguage do
  @moduledoc """
  Elixir bindings for model-language — a typed, safe template language for
  AI-agent prompts.

  Runs the exact same engine as the JavaScript/TypeScript package via an embedded
  WebAssembly module (`priv/model_language.wasm`), so every template renders
  byte-for-byte identically. Never crashes: template problems degrade to empty
  output plus a warning.

      iex> ModelLanguage.render("Hi {{ user.name | default: 'there' }}!", data: %{"user" => %{"name" => "Vasyl"}})["text"]
      "Hi Vasyl!"
  """

  @doc "Render `template` against `data`. Opts: `:data`, `:schema`, `:options`."
  def render(template, opts \\ []) do
    invoke(%{
      "op" => "render",
      "template" => template,
      "data" => Keyword.get(opts, :data, %{}),
      "schema" => Keyword.get(opts, :schema, []),
      "options" => Keyword.get(opts, :options, %{})
    })
  end

  @doc "Validate `template` against a schema. Opts: `:schema`, `:options`."
  def validate(template, opts \\ []) do
    invoke(%{
      "op" => "validate",
      "template" => template,
      "schema" => Keyword.get(opts, :schema, []),
      "options" => Keyword.get(opts, :options, %{})
    })
  end

  @doc "Parse `template` to its AST."
  def parse(template), do: invoke(%{"op" => "parse", "template" => template})

  defp wasm_bytes do
    path =
      System.get_env("MODEL_LANGUAGE_WASM") ||
        Path.join(Application.app_dir(:model_language, "priv"), "model_language.wasm")

    File.read!(path)
  end

  defp invoke(request) do
    {:ok, stdin} = Wasmex.Pipe.new()
    {:ok, stdout} = Wasmex.Pipe.new()
    Wasmex.Pipe.write(stdin, Jason.encode!(request))
    Wasmex.Pipe.seek(stdin, 0)

    wasi = %Wasmex.Wasi.WasiOptions{stdin: stdin, stdout: stdout}
    {:ok, pid} = Wasmex.start_link(%{bytes: wasm_bytes(), wasi: wasi})
    # A clean WASI exit returns an error; the response is already written.
    Wasmex.call_function(pid, "_start", [])

    Wasmex.Pipe.seek(stdout, 0)
    Jason.decode!(Wasmex.Pipe.read(stdout))
  end
end
