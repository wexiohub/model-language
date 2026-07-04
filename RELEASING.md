# Releasing

`model-language` ships as one engine to **six package registries**, all at
`1.0.0`. The JS package is the canonical engine; every other package embeds the
same WebAssembly module and produces byte-for-byte identical output (proven by
the shared conformance suite in CI).

| Registry | Package | Install | Verified in CI |
|---|---|---|---|
| **npm** | `model-language` | `npm i model-language` | build |
| **PyPI** | `model-language` | `pip install model-language` | `python -m build` |
| **crates.io** | `model-language` | `cargo add model-language` | `cargo package` |
| **RubyGems** | `model-language` | `gem install model-language` | `gem build` |
| **NuGet** | `ModelLanguage` | `dotnet add package ModelLanguage` | `dotnet pack` |
| **Hex** | `model_language` | `{:model_language, "~> 1.0"}` | `mix hex.build` |

Publishing is a manual, authenticated step — run it deliberately, and only when
CI is green on `main`. Go (`go get …/hosts/go`) and C++ (vendor/vcpkg) have no
central registry, so nothing to publish there.

## 0. Build the WASM module once

Everything below embeds this artifact. Needs the [`javy`](https://github.com/bytecodealliance/javy)
CLI on `PATH`.

```sh
pnpm install && pnpm wasm:build          # -> wasm/dist/model_language.wasm
WASM=$(pwd)/wasm/dist/model_language.wasm
```

## 1. npm — `model-language`

```sh
npm login
npm publish                              # prepublishOnly builds dist/
```

## 2. PyPI — `model-language`

```sh
cp "$WASM" hosts/python/model_language/model_language.wasm
cd hosts/python
python -m pip install build twine
python -m build                          # dist/*.whl + *.tar.gz
twine upload dist/*                       # PyPI token in ~/.pypirc
cd -
```

## 3. crates.io — `model-language`

```sh
cp "$WASM" hosts/rust/model_language.wasm
cd hosts/rust
cargo login                              # once, with your crates.io token
cargo publish --allow-dirty              # .wasm is git-ignored -> allow-dirty
cd -
```

## 4. RubyGems — `model-language`

```sh
cp "$WASM" hosts/ruby/lib/model_language.wasm
cd hosts/ruby
gem build model-language.gemspec
gem push model-language-1.0.0.gem        # prompts for RubyGems credentials/OTP
cd -
```

## 5. NuGet — `ModelLanguage`

```sh
cp "$WASM" hosts/csharp/src/model_language.wasm
cd hosts/csharp
dotnet pack src/ModelLanguage.csproj -c Release
dotnet nuget push src/bin/Release/ModelLanguage.1.0.0.nupkg \
  --api-key "$NUGET_API_KEY" --source https://api.nuget.org/v3/index.json
cd -
```

## 6. Hex — `model_language`

```sh
mkdir -p hosts/elixir/priv && cp "$WASM" hosts/elixir/priv/model_language.wasm
cd hosts/elixir
mix deps.get
HEX_API_KEY=... mix hex.publish          # or run `mix hex.publish` and auth interactively
cd -
```

## 7. Tag the release

```sh
git tag v1.0.0 && git push origin v1.0.0
```

## Automating later (optional)

A tag-triggered `release.yml` can run all of the above on `v*` tags once each
registry's token is in repo secrets (`NPM_TOKEN`, `PYPI_API_TOKEN`,
`CARGO_REGISTRY_TOKEN`, `RUBYGEMS_API_KEY`, `NUGET_API_KEY`, `HEX_API_KEY`). The
build steps are exactly what the `WASM bridge` workflow already runs per host;
add the publish command after each.
