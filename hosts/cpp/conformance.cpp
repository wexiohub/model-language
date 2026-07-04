// C++ host for the model-language WebAssembly module (wasmtime C API). Runs the
// exact same engine as the TypeScript package: one JSON request in on the
// module's stdin, one JSON response out on its stdout. This program runs the
// shared conformance fixtures through the host and exits non-zero on any
// mismatch (parity with TypeScript).

#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
#include <string>
#include <vector>

#include <unistd.h>

#include <nlohmann/json.hpp>
#include <wasi.h>
#include <wasmtime.h>

using json = nlohmann::json;

static std::vector<uint8_t> read_file(const std::string& path) {
  std::ifstream f(path, std::ios::binary);
  return {std::istreambuf_iterator<char>(f), std::istreambuf_iterator<char>()};
}

static json invoke(wasm_engine_t* engine, wasmtime_module_t* module, const json& request) {
  const std::string body = request.dump();

  char in_path[] = "/tmp/ml-in-XXXXXX";
  char out_path[] = "/tmp/ml-out-XXXXXX";
  int in_fd = mkstemp(in_path);
  if (write(in_fd, body.data(), body.size()) < 0) { /* ignore */ }
  close(in_fd);
  close(mkstemp(out_path));

  wasmtime_store_t* store = wasmtime_store_new(engine, nullptr, nullptr);
  wasmtime_context_t* context = wasmtime_store_context(store);

  wasi_config_t* wasi = wasi_config_new();
  wasi_config_set_stdin_file(wasi, in_path);
  wasi_config_set_stdout_file(wasi, out_path);
  wasmtime_error_t* err = wasmtime_context_set_wasi(context, wasi);
  if (err) wasmtime_error_delete(err);

  wasmtime_linker_t* linker = wasmtime_linker_new(engine);
  err = wasmtime_linker_define_wasi(linker);
  if (err) wasmtime_error_delete(err);

  wasmtime_instance_t instance;
  wasm_trap_t* trap = nullptr;
  err = wasmtime_linker_instantiate(linker, context, module, &instance, &trap);
  if (err) wasmtime_error_delete(err);
  if (trap) wasm_trap_delete(trap);

  wasmtime_extern_t start;
  wasmtime_instance_export_get(context, &instance, "_start", strlen("_start"), &start);
  trap = nullptr;
  // A clean WASI exit surfaces as a trap; the response is already written.
  err = wasmtime_func_call(context, &start.of.func, nullptr, 0, nullptr, 0, &trap);
  if (err) wasmtime_error_delete(err);
  if (trap) wasm_trap_delete(trap);

  wasmtime_linker_delete(linker);
  wasmtime_store_delete(store);

  std::ifstream outf(out_path);
  std::string out{std::istreambuf_iterator<char>(outf), std::istreambuf_iterator<char>()};
  unlink(in_path);
  unlink(out_path);
  return json::parse(out);
}

static std::vector<std::string> codes(const json& arr) {
  std::vector<std::string> out;
  if (arr.is_array())
    for (const auto& d : arr)
      if (d.contains("code")) out.push_back(d["code"].get<std::string>());
  return out;
}

static std::vector<std::string> strings(const json& arr) {
  std::vector<std::string> out;
  if (arr.is_array())
    for (const auto& s : arr) out.push_back(s.get<std::string>());
  return out;
}

int main() {
  const char* wasm_env = std::getenv("MODEL_LANGUAGE_WASM");
  const std::string wasm_path = wasm_env ? wasm_env : "../../wasm/dist/model_language.wasm";
  const std::string cases_dir = "../../conformance/cases";

  auto bytes = read_file(wasm_path);
  wasm_engine_t* engine = wasm_engine_new();
  wasmtime_module_t* module = nullptr;
  wasmtime_error_t* err = wasmtime_module_new(engine, bytes.data(), bytes.size(), &module);
  if (err || !module) {
    std::cerr << "failed to load module\n";
    return 1;
  }

  std::vector<std::string> paths;
  for (const auto& e : std::filesystem::directory_iterator(cases_dir))
    if (e.path().extension() == ".json") paths.push_back(e.path().string());
  std::sort(paths.begin(), paths.end());

  int failures = 0, count = 0;
  for (const auto& path : paths) {
    std::ifstream f(path);
    json fixture = json::parse(f);
    const std::string name = fixture.value("name", "");
    const std::string tmpl = fixture.value("template", "");
    const json& expect = fixture["expect"];
    count++;

    if (expect.contains("output")) {
      json options = json::object();
      if (fixture.contains("now")) options["now"] = fixture["now"];
      if (fixture.contains("snippets")) options["snippets"] = fixture["snippets"];
      json req = {{"op", "render"},
                  {"template", tmpl},
                  {"data", fixture.value("data", json::object())},
                  {"schema", fixture.value("schema", json::array())},
                  {"options", options}};
      json res = invoke(engine, module, req);
      if (res.value("text", "") != expect["output"].get<std::string>() ||
          codes(res["warnings"]) != strings(expect.value("warnings", json::array()))) {
        std::cerr << "FAIL render: " << name << "\n";
        failures++;
      }
    }

    if (expect.contains("diagnostics")) {
      json req = {{"op", "validate"},
                  {"template", tmpl},
                  {"schema", fixture.value("schema", json::array())},
                  {"options", json::object()}};
      json res = invoke(engine, module, req);
      auto got = codes(res["diagnostics"]);
      std::sort(got.begin(), got.end());
      auto want = strings(expect["diagnostics"]);
      std::sort(want.begin(), want.end());
      if (got != want) {
        std::cerr << "FAIL validate: " << name << "\n";
        failures++;
      }
    }
  }

  std::cout << count << " cases, " << failures << " failures\n";
  return failures == 0 ? 0 : 1;
}
