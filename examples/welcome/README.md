# welcome — input → output

> **Renders today (0.1a)** — interpolation + the `default` filter. This output is
> asserted by a golden test (`test/golden/examples.golden.test.ts`).

## Input — [`welcome.mlt`](./welcome.mlt)

```
You are {{agent.name}}, support for {{org.name}}.
The user's name is {{user.name | default: "there"}}. Reply in {{user.language | default: "English"}}.
```

## Data snapshot

```json
{
  "agent": { "name": "Aria" },
  "org": { "name": "Acme" },
  "user": { "name": null, "language": null }
}
```

## Output

`user.name` and `user.language` are `null`, so both fall back:

```
You are Aria, support for Acme.
The user's name is there. Reply in English.
```

Try it: `pnpm example:run examples/welcome/welcome.mlt`.
