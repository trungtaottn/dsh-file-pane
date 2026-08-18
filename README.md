# dsh-file-pane

[![CI](https://img.shields.io/github/actions/workflow/status/trungtaottn/dsh-file-pane/ci.yml?branch=main&label=CI)](https://github.com/trungtaottn/dsh-file-pane/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933)](https://nodejs.org/)

A DeepSeek Harness plugin that lets you **read agent-produced/edited files in
the DSH **web** UI from a remote device** — no download needed. Ideal when DSH
runs on a homelab/server and you connect from another machine.

`dsh-file-pane` renders files in a **Codex/Warp-style pane** (a files rail plus
a content pane with line numbers / inline images / PDF). It is **read-only** and
scoped to a workspace root, blocking path traversal and symlink escapes.

<p align="center">
  <img src="./docs/demo.svg" width="720" alt="dsh-file-pane in action">
</p>

> v0.3.0 — adds **env-configurable workspace root** (no more hardcoded path),
> **`.docx` preview** (host-side mammoth → safe markdown), **absolute-path
> support** (deliverable paths from any session cwd resolve correctly), and a
> **PDF.js viewer** (search/zoom/text layer) with a native-iframe fallback.
> Still read-only, still scoped to one workspace root, still zero client-JS for
> the preview pipeline.

## Why

Power-users run DSH on a server and talk to it over the web from another
device. The built-in "deliverables" row only opens files **on the host**
(`host.openPath`, loopback-bound) — so on a remote device you can't read them
without an SSH session or a download. This plugin adds a web-accessible read
view for exactly that case, **and** upgrades the produced-file chips so they
navigate straight into that view when you're remote.

## Install

```sh
# from your profile
dsh plugin --profile web add /path/to/dsh-file-pane
systemctl --user daemon-reload 2>/dev/null; :
# restart the web service to load the new bundle + route
sudo systemctl restart deepseek-harness-web
```

Default workspace root is `$HOME`. Override it with the `DSH_FILE_PANE_ROOT`
environment variable (the patch layer reads it via `!!js process.env`), or set
the row's `config.workspaceRoot` in a later patch overlay (which wins):

```yaml
# dsh-file-pane / cordis.patch.yml (or your profile patch overlay)
- insert:
    - id: dsh-file-pane
      name: 'dsh-file-pane'
      config:
        workspaceRoot: !!js process.env.DSH_FILE_PANE_ROOT ?? process.env.HOME
        maxTextBytes: 2097152
```

```sh
# example: serve a different workspace without editing any file
DSH_FILE_PANE_ROOT=/srv/projects systemctl restart deepseek-harness-web
```

## Usage

On your remote device's browser, open (host = your DSH web origin):

```
/browser/                            files rail at the workspace root
/browser/?path=docs/README.md        markdown preview (toggle preview/raw)
/browser/?path=src/app.ts            line-numbered code view
/browser/?path=img/logo.png          inline image
/browser/?path=docs/manual.pdf       PDF.js viewer (search/zoom/text layer)
/browser/?path=docs/report.docx      docx preview (host-side mammoth)
/browser/?path=docs/&raw=1           raw bytes of a file
```

Paths may be workspace-relative **or** absolute-under-root
(`/browser/?path=/home/kaynt/src/app.ts` works) — the pane normalizes any
absolute path inside its configured root, so file chips opened from sessions
whose cwd is a subdirectory resolve to the right file.

## Version diff (before → after)

When an agent edits a file, the client-plugin spills the edit's **before/after**
to the host (RAM only, keyed by the currently open session) and the pane renders
them:

```
/browser/?path=src/app.ts&diff=1&session=<id>          unified diff (default)
/browser/?path=src/app.ts&diff=1&session=<id>&mode=sbs side-by-side
```

The diff view follows Codex/git conventions — line-number gutter + `+`/`-` signs,
muted red/green tints (`#4a221d` / `#213a2b`), `@@ path @@` hunk header — with a
bottom status line (`path · session · +a/−r`) and a toggle between **unified**
and **side-by-side**. `.md` files open as a rendered **preview** by default with
a preview/raw toggle; `.docx` files open as a mammoth-converted markdown preview
with the same toggle (raw bytes stay available at `&raw=1`).

> Spill is RAM + session-scoped: only the session open when the edit happened
> carries its before/after; nothing touches disk and nothing survives a restart.
> Open via the produced-file chip (which carries the session) or add
> `&session=<id>` manually.

Files and directories only inside the configured root; anything else returns
`403`.

## Produced files open the pane (remote)

When you're viewing DSH from a **non-loopback** device, the in-chat **"Produced"**
file chips (the ones an agent creates/edits) now open the pane view directly —
`location` → `/browser/?path=<file>`. On the machine that actually runs DSH
(loopback), the built-in behavior is untouched.

This is shipped as a **client-plugin** (`dsh.client`, `client/index.tsx` → built
`lib/client.js`). It registers a `conversation.chat.turnTail` slot at priority
`-1` that supersedes the built-in "Produced" row only when remote, reusing the
same `deliverables` turn data. Because it is a chain slot (first non-null match
wins), no duplicate row appears.

The bundle must export the cordis `inject` service list
(`["slots", "locale", "connection"]`) exactly like the built-in deliverables
plugin does — the loader waits for those services before calling `apply`, so
without them the plugin can activate before its seats exist and the whole web
boot fails ("Failed to load plugins: dsh-file-pane"). `npm test` guards this.

> Requires DSH to serve the plugin's pre-built `lib/client.js`. Rebuild after
> editing the client source with `npm run build:client`, then restart the web
> service (plugin-set changes reach the browser on restart).

## Security

- Read-only — no write/deploy surface.
- Strict path handling through `lib/view-core.mjs`: `path.resolve` + realpath +
  root-prefix check; `..`, symlink escapes, and absolute paths outside the
  configured root are `403`.
- Optional render cap (`maxTextBytes`, default 2 MiB) so a huge log truncates
  instead of hanging the page.
- `.docx` conversion (mammoth) output is untrusted file content — it is only
  ever rendered through the XSS-safe markdown pipeline, never injected raw.
- PDF.js viewer assets are served from `assets/pdfjs` behind a basename +
  resolve-inside guard; nothing outside that directory is reachable.
- No credentials are touched or served.

## Architecture

```
dsh-file-pane/
├─ lib/index.js         host plugin: registers /browser on ctx.webServer
├─ lib/view-core.mjs    mount-agnostic logic: root guard, MIME, list/read (reusable)
├─ lib/view-html.mjs    pane renderer (HTML) — the HOST mount
├─ lib/docx.mjs         host-side .docx → safe markdown (mammoth, lazy-loaded)
├─ lib/client.js        pre-built client-plugin bundle (exports["./client"])
├─ client/index.tsx     client-plugin source: produced-file chips → /browser (remote)
├─ assets/pdfjs/        pdfjs-viewer-element dist (served at /browser/vendor/pdfjs)
├─ scripts/build-client.mjs  esbuild: client/index.tsx → lib/client.js (__ModuleLoader__)
├─ scripts/build-pdfjs.mjs   copies pdfjs-viewer-element dist → assets/pdfjs
├─ cordis.patch.yml     mounts the bundle (host row) + dsh.client declares the browser half
└─ package.json         declares dsh.bundle (host) + dsh.client (browser)
```

The security core (`view-core`) is independent of the renderer, so migrating
mounts later only means adding a new renderer over the same core. The browser
half (`client/`) is a separate seam: `dsh.client.platform:"web"` + pre-built
`lib/client.js`, which `dsh-client-modules` registers into `window.__DSH_BOOT__`
and serves at `/plugins/dsh-file-pane/client.js`.

## Development

```
npm run build          # build client bundle + pdfjs assets
npm test               # host route guards + client-plugin bundle contract + docx/pdfjs
node --input-type=module -e "import('./lib/index.js').then(m=>console.log(m.name))"
```

> Rebuild after editing the client source with `npm run build:client`, and copy
> PDF.js assets with `npm run build:assets` (both run automatically via
> `pretest`). A `dsh --profile web --dump-config` should show the plugin row
> with the env-resolved `workspaceRoot`.

## License

MIT
