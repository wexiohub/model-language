defmodule ModelLanguage.MixProject do
  use Mix.Project

  def project do
    [
      app: :model_language,
      version: "1.0.0",
      elixir: "~> 1.15",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      description:
        "A typed, safe template language for AI-agent prompts. Runs the exact same engine " <>
          "as the JavaScript/TypeScript package via an embedded WebAssembly module.",
      package: package()
    ]
  end

  def application, do: [extra_applications: [:logger]]

  defp deps do
    [
      {:wasmex, "~> 0.14"},
      {:jason, "~> 1.4"},
      {:ex_doc, ">= 0.0.0", only: :dev, runtime: false}
    ]
  end

  defp package do
    [
      name: "model_language",
      licenses: ["MIT"],
      links: %{"GitHub" => "https://github.com/wexiohub/model-language"},
      files: ~w(lib priv mix.exs README.md)
    ]
  end
end
