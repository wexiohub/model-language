# Releasing

Two artifacts ship from this repo: the **npm** package (`model-language`, the JS
engine) and the **PyPI** package (`model-language`, the Python bindings that host
the WASM module). Both are `1.0.0`.

Publishing is a manual, authenticated step — run it deliberately.

## 1. Pre-flight (must be green)

```sh
pnpm install
pnpm lint && pnpm typecheck && pnpm test:cov   # 100% coverage gate
pnpm build                                     # dist/ (ESM + CJS + .d.ts)
```

CI (`CI` + `WASM bridge` workflows) must be green on `main`.

## 2. npm — `model-language`

```sh
npm login                 # once, if not already
npm publish               # runs prepublishOnly (pnpm build); publishes 1.0.0
```

Unscoped public package — no `--access` flag needed. Enter your npm OTP when
prompted. Verify: <https://www.npmjs.com/package/model-language>.

## 3. PyPI — `model-language`

The wheel must embed the built `.wasm`, so build it first and copy it into the
package:

```sh
pnpm install && pnpm wasm:build                                  # needs the `javy` CLI on PATH
cp wasm/dist/model_language.wasm hosts/python/model_language/model_language.wasm

cd hosts/python
python -m pip install build twine
python -m build                                                  # dist/*.whl + *.tar.gz

# smoke-test the wheel in a clean venv before uploading
python -m venv /tmp/ml && /tmp/ml/bin/pip install dist/*.whl
/tmp/ml/bin/python -c "from model_language import render; print(render('Hi {{n}}', data={'n':'x'})['text'])"
# -> Hi x

twine upload dist/*       # PyPI token in ~/.pypirc or via prompt
```

Install the `javy` CLI from <https://github.com/bytecodealliance/javy/releases>
(the `WASM bridge` workflow shows the download step).

## 4. Tag the release

```sh
git tag v1.0.0 && git push origin v1.0.0
```

## Automating later (optional)

A tag-triggered `release.yml` workflow can do all of the above on `v*` tags once
`NPM_TOKEN` and `PYPI_API_TOKEN` are added to repo secrets — the same build steps
the `WASM bridge` workflow already runs, plus `npm publish` and `twine upload`.
