# @local/dsh-mcp-servers

[![CI](https://github.com/zeno528/dsh-mcp-servers/actions/workflows/ci.yml/badge.svg)](https://github.com/zeno528/dsh-mcp-servers/actions/workflows/ci.yml)
[![Secrets scan](https://github.com/zeno528/dsh-mcp-servers/actions/workflows/gitleaks.yml/badge.svg)](https://github.com/zeno528/dsh-mcp-servers/actions/workflows/gitleaks.yml)

MCP server management for DSH Web as a **top-level sidebar page** ("MCP"): add,
edit, enable, and remove MCP servers, set their credentials, and read each
server's live connection state and tool count. The page is a master–detail
layout — a server list on the left, the selected server's edit form on the
right.

> **Note**: this is a third-party bundle for DSH (DeepSeek Harness). It depends
> on the DSH runtime (`@deepseek-ai/*` packages, resolved from the host
> installation at load time), which is not distributed through this repository.

## Files

| File | Role |
|---|---|
| `package.json` | Bundle manifest (`dsh.bundle.patch`) plus the Web client declaration (`dsh.client`). |
| `cordis.patch.yml` | Inserts the single Host row `mcp-servers`, whose `config.servers` is the inherited default list (the migrated four servers). |
| `index.js` | Host half: volatile `Config.servers`, Loader reconciliation, credential resolution, and the authenticated status route. |
| `client.js` | Browser half: the top-level page (`sidebar.panellist` + `main` slots) and the live-status poller. |
| `locale/en.json`, `locale/zh.json` | Bundle display metadata. |
| `icon.svg` | Original bundle artwork. |

## How it works

- The settings document entry `mcp-servers` (the profile's Cordis patch) is the
  single durable source of truth. Its `servers` array is the only volatile
  field, so one form edit is one atomic settings write.
- The Host half derives one root-tree `@deepseek-ai/dsh-mcp-client` Loader entry
  per enabled server (`mcp-server-<serverName>`). Derived entries are
  runtime-only — the root Loader tree is in-memory, so they are recreated on
  every start, HMR recomposition, or plugin reload.
- Reconciliation runs on activation, on `loader/volatile-update`, on
  `credentials/reference-updated`, and on a 5 s safety tick. It only reloads a
  connection when the server row or its resolved credential actually changed.
- A server whose `serverName` is still served by a hand-written `dsh-mcp-client`
  row is reported as a name conflict and skipped; removing that row lets this
  page take over automatically on the next tick.
- Credentials are references, never literals: `credentialRef` names an
  environment-variable-shaped credential reference resolved through
  `ctx.credentials` (stored file → launch env → project `.env` → `~/.dsh/.env`)
  immediately before the derived entry is materialized.
- The live status projection is served at `POST /plugin-mcp-servers/status`.
  The route is registered through `ctx.webServer` and each request passes the
  connection trust fence (`ctx.connection.requestRejection`), so only the
  authenticated page can read it.

## Where the page lives

The browser half registers two slots and no longer registers `plugins.item`:

- `sidebar.panellist` — the sidebar entry (`id: 'mcp'`), which is how the page
  becomes a top-level panel next to Plugins and Schedules.
- `main` — the page itself (`key: 'mcp'`), rendered when that panel is selected.

The page owns its settings form (`ctx.configForms.get('mcp-servers')`) and reads
and writes it directly, so it does not depend on the Plugins page.

## Resetting to defaults

"Reset to default" in the page clears the profile-patch override; the entry then
inherits `config.servers` from this bundle's `cordis.patch.yml`.

## Iterating on the bundle

- Host `index.js` changes take effect on the next HMR recomposition (any profile
  patch write triggers one). Client `client.js` changes are picked up by the
  client-module HMR path on their own: `dsh-client-hmr` polls the client
  artifact's mtime/ctime/size every 500 ms and re-imports the module when the
  content fingerprint changes.
- `package.json` changes (especially `dsh.client` and `peerDependencies`) are
  cached per package for the process lifetime; reinstall/replace the bundle or
  restart the app.
- `@deepseek-ai/schemastery` is declared as a peer dependency on purpose: the
  linked-root module resolution routes that bare import to the DSH installation
  copy, so the plugin does not vendor its own copy.
