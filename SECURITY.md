# Security Policy

## Reporting a vulnerability

If you believe you have found a security vulnerability in model-language, please
report it **privately** — do not open a public issue.

Use GitHub's private vulnerability reporting: go to the repository's **Security**
tab → **Report a vulnerability**, or open
<https://github.com/wexiohub/model-language/security/advisories/new>.

We will investigate all legitimate reports and do our best to fix confirmed
issues quickly. Please give us a reasonable window to address the problem before
any public disclosure.

## Scope

model-language is a pure, sandboxed template engine: it has no network, file
system, or process access; `render()` never throws; and the WebAssembly module
runs with no ambient capabilities (clocks, randomness, stdio, and network are all
disabled). Reports of particular interest include ways to:

- make the engine crash, hang, or exhaust memory on crafted input,
- leak data across the template boundary (e.g. surface a value the schema marks
  private), or
- escape the documented sandbox guarantees in any host.

> Private vulnerability reporting must be enabled in the repository settings
> (Settings → Code security → Private vulnerability reporting).
