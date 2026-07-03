# Loops

**Milestone 0.2.**

Repeat text once per array item.

```
{{for item in order.items}}
- {{item.title}} × {{item.qty}}
{{/for}}
```

The source is any array expression — including a [filter pipeline](./filters/README.md):

```
{{for item in order.items | where: "status", "==", "unshipped" | sort: "price", "desc" | limit: 3}}
- {{item.title}} — {{item.price | currency: order.currency}}
{{/for}}
```

## Loop locals

Inside the body you get:

| Local | Meaning |
|---|---|
| `item` (your chosen name) | the current element |
| `loop.index` | 1-based position |
| `loop.first` / `loop.last` | boolean edges |
| `loop.count` | total number of items |

Naming the loop variable the same as an outer loop's shadows it and emits a
warning (`ML221`).

## Empty state

An empty, `null`, or `undefined` source renders nothing — "no items, no lines".
Provide a fallback with an `else` inside the loop:

```
{{for t in user.open_tickets}}
- #{{t.id}}: {{t.subject}}
{{else}}
The user has no open tickets.
{{/for}}
```

## Whitespace

A line containing only loop tags is removed from the output, so loops don't leave
blank-line residue. See [whitespace hygiene](./directives.md#whitespace-hygiene).

## See also

- [Filters](./filters/README.md) (`where`, `sort`, `limit`, `pluck`, …) ·
  [Variables](./variables.md)
