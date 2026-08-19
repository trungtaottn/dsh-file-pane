# dsh-file-pane

[![CI](https://img.shields.io/github/actions/workflow/status/trungtaottn/dsh-file-pane/ci.yml?branch=main&label=CI)](https://github.com/trungtaottn/dsh-file-pane/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933)](https://nodejs.org/)

A DeepSeek Harness plugin that lets you **read agent-produced/edited files in
the DSH web UI from a remote device** — no download needed. Ideal when DSH
runs on a homelab/server and you connect from another machine.

`dsh-file-pane` renders files in a **Codex/Warp-style pane** (a files rail plus
a content pane with line numbers / inline images / PDF / syntax highlighting),
and adds an **in-app dock** (right `details` column) with workspace search,
git history & blame, live file watching, and a theme switcher. It is
**read-only** (except an opt-in, default-off local `git commit`) and scoped to
a workspace root, blocking path traversal and symlink escapes.

<p align="center">
  <img src="./docs/demo.svg" width="720" alt="dsh-file-pane in action">
</p>

## Features

- **Remote file view** — browse/read the workspace in the DSH web UI from any
  device: `/browser/` listing, line-numbered code, markdown preview, inline
  images, PDF.js viewer, host-side `.docx` preview, raw bytes.
- **Version diff** — before/after of agent edits (RAM, session-scoped),
  unified or side-by-side, with intraline word-diff marks.
- **In-app dock** (`details` column): file tree, git branch + changes,
  commit history, per-file blame, workspace search, live file watching, and a
  theme switcher.
- **Host-side syntax highlighting** — Shiki (pure-JS engine, no WASM) token
  spans with dual-theme CSS vars, plus large-file windowing.
- **Read-mostly git** — branch/status/log/blame; an opt-in local `git commit`
  that is **disabled by default** (`gitWriteEnabled: false`).

## Install

```sh
# from your profile
dsh plugin --profile web add /path/to/dsh-file-pane
systemctl --user daemon-reload 2>/dev/null; :
# restart the web service to load the new bundle + route
sudo systemctl restart dsh-file-pane-web
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
DSH_FILE_PANE_ROOT=/srv/projects systemctl restart dsh-file-pane-web
```

All per-feature settings (theme preset, search mode/globs/max, enabled
languages, windowing threshold, git write flag + history depth, live-watch
toggle + debounce/poll + trusted hosts) are config keys on the plugin row —
see `cordis.patch.yml` for the full documented set with defaults.

## Usage

On your remote device's browser, open (host = your DSH web origin):

```
/browser/                            files rail at the workspace root
/browser/?path=docs/README.md        markdown preview (toggle preview/raw)
/browser/?path=src/app.ts            line-numbered, syntax-highlighted code
/browser/?path=img/logo.png          inline image
/browser/?path=docs/manual.pdf       PDF.js viewer (search/zoom/text layer)
/browser/?path=docs/report.docx      docx preview (host-side mammoth)
/browser/?path=docs/&raw=1           raw bytes of a file
```

Paths may be workspace-relative **or** absolute-under-root — the pane
normalizes any absolute path inside its configured root, so file chips opened
from sessions whose cwd is a subdirectory resolve to the right file.

The **in-app dock** (right `details` column) adds:

```
Files          file tree + breadcrumb nav + version diff toggle
Git / Changes  branch switch, dirty-file set, commit history, per-file blame
Search         workspace search (Name/Content) via /browser/api/search
```

## Version diff (before → after)

When an agent edits a file, the client-plugin spills the edit's **before/after**
to the host (RAM only, keyed by the currently open session) and the pane renders
them:

```
/browser/?path=src/app.ts&diff=1&session=<id>          unified diff (default)
/browser/?path=src/app.ts&diff=1&session=<id>&mode=sbs side-by-side
```

The diff view follows Codex/git conventions — line-number gutter + `+`/`-` signs,
muted red/green tints, `@@ path @@` hunk header — with a bottom status line and
a unified ↔ side-by-side toggle. Changed lines carry **intraline word-diff
marks** (GitHub-style inline add/del blocks). `.md` files open as a rendered
**preview** by default with a preview/raw toggle; `.docx` files open as a
mammoth-converted markdown preview with the same toggle (raw bytes stay
available at `&raw=1`).

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

The bundle must export the cordis `inject` service list exactly like the
built-in deliverables plugin does — the loader waits for those services before
calling `apply`, so without them the plugin can activate before its seats exist
and the whole web boot fails. `npm test` guards this.

> Requires DSH to serve the plugin's pre-built `lib/client.js`. Rebuild after
> editing the client source with `npm run build:client`, then restart the web
> service (plugin-set changes reach the browser on restart).

## Security

- **Read-only** — the only write surface is an opt-in local `git commit`,
  disabled by default (`gitWriteEnabled: false` → 403); no push/pull/fetch.
- **Strict path handling** through `lib/view-core.mjs` (`resolveWithin`):
  `..`, symlink escapes, and absolute paths outside the configured root are
  `403`.
- **WS auth fence** on `/browser/ws`: loopback/trusted-hosts + same-origin +
  `sec-fetch-site`; raw 403 before handshake; downlink-only (`close(1008)`).
- **CSRF defense-in-depth**: POST routes reject cross-site `Origin`.
- Optional render cap (`maxTextBytes`, default 2 MiB); search/blame caps and
  timeouts bound resource use.
- Untrusted file content (markdown/docx) is only ever rendered through the
  XSS-safe pipeline — never injected raw.
- No credentials are touched or served.

## Architecture

The plugin is one cordis plugin with two halves (host + browser). Point owners:
`lib/` is the host, `client/` is the browser bundle source, `cordis.patch.yml`
is the config surface.

```
dsh-file-pane/
├─ lib/index.js         host plugin: /browser routes + spill API + /browser/ws upgrade
├─ lib/view-core.mjs    security core (resolveWithin) + diffSides + renderMarkdown
├─ lib/view-html.mjs    pane renderer (HTML) — file/dir/diff/commit pages
├─ lib/git.mjs          read-mostly git façades (branch/status/log/blame/gated commit)
├─ lib/search.mjs       ripgrep workspace search engine (NDJSON stream)
├─ lib/highlight.mjs    host-side Shiki syntax highlighting (pure-JS engine)
├─ lib/watch.mjs        chokidar workspace watcher (live file watching)
├─ lib/ws-server.mjs    /browser/ws downlink-only WebSocket (auth-fenced)
├─ lib/docx.mjs         host-side .docx → safe markdown (mammoth, lazy-loaded)
├─ lib/client.js        pre-built client-plugin bundle (committed)
├─ client/index.tsx     client-plugin source: produced chips + dock
├─ client/theme-*.ts    theme presets + controller (dock theme switcher)
├─ client/search-text.ts pure XSS-safe snippet helpers (search results)
├─ assets/pdfjs/        pdfjs-viewer-element dist (served at /browser/vendor/pdfjs)
├─ scripts/build-client.mjs  esbuild: client/index.tsx → lib/client.js
├─ scripts/build-pdfjs.mjs   copies pdfjs-viewer-element dist → assets/pdfjs
├─ cordis.patch.yml     mounts the bundle (host row) + dsh.client declares the browser half
└─ package.json         declares dsh.bundle (host) + dsh.client (browser)
```

`lib/` modules are the executable owners of each capability — read them for
the current behavior; docs here only explain why each surface exists.

## Development

```sh
NODE_OPTIONS= npm test               # full suite (route guards + client contract + search/highlight/git/watch)
NODE_OPTIONS= npm run build          # build client bundle + pdfjs assets
NODE_OPTIONS= npm run check          # import lib/index.js sanity
NODE_OPTIONS= npm pack --dry-run     # verify publishable tarball
```

> Rebuild after editing the client source with `npm run build:client`, and copy
> PDF.js assets with `npm run build:assets` (both run automatically via
> `pretest`). Every `node`/`npm` command needs the `NODE_OPTIONS= ` prefix
> (dd-trace preload is broken). Version/release is GitHub-only via
> semantic-release (see `release.config.mjs`).

## License

MIT
