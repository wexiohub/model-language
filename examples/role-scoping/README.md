# role-scoping — input → output

> **Renders** — `==` on a role, `elseif` chain, `exists`, the
> `default` filter, array stringification. Role-based access scoping for a data
> platform.

## Input — [`role-scoping.mlt`](./role-scoping.mlt)

```
User: {{user.name}} · Role: {{user.role}} · Workspace: {{org.name}}

{{if user.role == "viewer"}}
Read-only user. Never share edit links, admin settings, or data-export instructions. If they need more access, direct them to {{user.admin_email | default: "their workspace admin"}}.
{{elseif user.role == "admin"}}
Full scope: dataset management, member roles, audit logs, billing.
{{elseif user.role == "analyst"}}
Scope: queries, reports, and dashboards. Redirect admin or billing questions to their workspace admin.
{{else}}
Unknown role — keep to public, general information only.
{{/if}}

{{if user.datasets exists}}
Datasets available to this user: {{user.datasets}}. Only reference these — never mention other datasets in the workspace.
{{/if}}
```

## Data snapshot

```json
{
  "org": { "name": "Acme Analytics" },
  "user": { "name": "Sam", "role": "analyst", "datasets": ["orders", "sessions"] }
}
```

## Output

Role is `analyst` → the analyst branch; `datasets` exists → the dataset scope line
is added (array stringified as `orders, sessions`):

```
User: Sam · Role: analyst · Workspace: Acme Analytics

Scope: queries, reports, and dashboards. Redirect admin or billing questions to their workspace admin.

Datasets available to this user: orders, sessions. Only reference these — never mention other datasets in the workspace.
```
