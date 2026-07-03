# Directives, includes & comments

**Milestone 0.3.**

## Comments

Never rendered, never sent downstream:

```
{# internal note for template authors — invisible in output #}
```

## Includes

Reuse org-level snippets:

```
{{include "policies/refund_policy"}}
{{include "escalation" with team="billing"}}   {# inside: {{params.team}} #}
```

Cycles are detected (`ML002`); maximum include depth is 5.

## Directives

Directives shape how the rendered content is used by the runtime — they are not
plain text.

### `#priority`

Routes its content to the prompt's protected section. Levels: `critical | high |
normal`.

```
{{#priority critical}}
{{if user.is_blocked}}Do not engage. Reply once that the org is unavailable, then stop.{{/if}}
{{/priority}}
```

### `#mode`

Emits a mode marker the agent runtime consumes (a tone/goal preset):

```
{{#mode winback}} … {{/mode}}
```

### `#block`

Emits a **runtime constraint** — it renders no text and disables the listed agent
tools for the conversation. A hard guarantee, not a textual plea. Actions are
validated against the agent's action registry (`agentId` on the validate call);
an unknown action is `ML240`.

```
{{#block actions: ["process_refund", "create_return_label"]}}
```

## Whitespace hygiene

The final prompt must read as if hand-written:

1. A line containing only block tags / directives and whitespace is removed
   entirely.
2. 3+ consecutive newlines left by dropped branches collapse to 2.
3. Interpolations preserve surrounding whitespace exactly.
4. Trailing whitespace is stripped.

Without rule 1, every false `if` would leave a blank line and a template with ten
conditions would render as holes and waste tokens.

## See also

- [Conditionals](./conditionals.md) · [Loops](./loops.md) ·
  [Diagnostics](./diagnostics.md)
