# AGENTS.md — dsh-file-pane

Agent context for DeepSeek Harness (DSH) plugin development on this repo.
Read this first. It is the source of truth for conventions, environment facts,
and the Git/release workflow.

> **Local-only deployment details** (real hostnames, ports, service names,
> machine paths) live in `AGENTS.local.md`, which is gitignored. If you are
> working on this repo on the owner's machine, read `AGENTS.local.md` too —
> it overrides the `<PLACEHOLDER>` values below with the real environment.

## What this project is

`dsh-file-pane` — a DeepSeek Harness (DSH) plugin that adds a read-only remote
**file viewer** to the DSH **web** UI: browse/read agent-produced or -edited
files from a remote device (homelab/server) without downloading. It renders in
a Codex/Warp-style pane plus an **in-app dock** (right `details` column).

Two halves of one cordis plugin (like dsh-better-sidebar-lite):
- **Host half** (Node): `lib/` — registers the `/browser` HTTP route, the spill
  API (`POST /browser/api/spill`, RAM, session-scoped), the PDF.js vendor
  assets, and the security core.
- **Client half** (browser): `client/index.tsx` → built `lib/client.js` —
  produced-file chips, the diff spill side-channel, and the in-app dock.

## Environment facts (verified)

- **DSH installed:** `@deepseek-ai/dsh@0.1.0-rc.6` (see `HANDOFF-next-session.md`).
- **NODE_OPTIONS is broken** (dd-trace preload): every `node`/`npm`/`dsht`/`dsh`
  command MUST be prefixed `NODE_OPTIONS= `:
  ```sh
  NODE_OPTIONS= npm test
  NODE_OPTIONS= npm run build:client
  NODE_OPTIONS= dsh --profile web --dump-config
  ```
- **Production service:** the production profile runs as a systemd service
  (name, port, remote-access hostname, and Cloudflare tunnel details are in
  `AGENTS.local.md`). Live only for verify; test changes on a sandbox profile
  first (see the testing rule below).
- `web_search` WORKS (has key) — research online is fine.

## Testing rule (IMPORTANT)

- **Always test on a SANDBOX profile, NEVER on production.** Production is the
  live systemd service (see `AGENTS.local.md` for the real name/port) — never
  restart it, never install/verify experimental builds against it, and never
  point dev builds at it.
- Sandbox loop: build locally → run unit tests (`NODE_OPTIONS= npm test`) →
  boot a separate sandbox profile on its own port (e.g. `:3090`) → verify
  there → only then open a PR. See `HANDOFF-next-session.md` for the sandbox
  profile recipe.
- If you must sanity-check the served bundle, verify content/auth on the
  sandbox port, and compare bundle hashes locally — do not mutate production.

## Commands (dev loop)

```sh
NODE_OPTIONS= npm test               # full suite (see test/ for count)
NODE_OPTIONS= npm run build          # build:client (esbuild) + build:assets (pdfjs-viewer-element)
NODE_OPTIONS= npm run build:client   # client/index.tsx → lib/client.js (lib/client.js MUST be committed)
NODE_OPTIONS= npm run build:assets   # copy node_modules/pdfjs-viewer-element/dist → assets/pdfjs
NODE_OPTIONS= npm pack --dry-run     # verify publishable tarball
NODE_OPTIONS= npm run check          # import lib/index.js sanity
```

## Local deployment & preview (IMPORTANT — two separate DSH surfaces)

The local machine runs **two independent DSH profiles on different ports** so
development never disturbs production (exact ports/service names are in
`AGENTS.local.md`):

| Profile | Runs | Source |
|---|---|---|
| **`web`** (production) | **beta release from GitHub** | pinned tarball, NOT the workspace |
| **`preview`** | the current workspace branch | `link:` → workspace |

- The `web` profile installs the plugin from a **packed tarball release URL**
  (see `scripts/deploy-local.mjs`), so `git checkout` in the workspace NEVER
  changes what production serves. `web` only updates when you run the deploy
  script (or install a newer beta tarball) + restart.
- The `preview` profile `link:`s the plugin to THIS workspace, so whatever
  branch is checked out is exactly what the preview port serves.

**Update production to the latest beta release:**
```sh
node scripts/deploy-local.mjs            # check + stage new beta (no restart)
node scripts/deploy-local.mjs --restart  # check + install + restart web
```

**Preview the feature branch you are developing (does NOT touch web):**
```sh
cd ~/Code/dsh-file-pane                 # adjust to your checkout path
git checkout <feature-branch>     # workspace now on the feature
node scripts/preview-branch.mjs   # boots the preview profile from the workspace
# open the preview URL printed by the script; production is untouched
node scripts/preview-branch.mjs --stop   # shut it down
```

## Architecture

```
lib/index.js         host: /browser route + spill API + vendor pdfjs assets
lib/view-core.mjs    security core (resolveWithin abs→rel) + diffSides + renderMarkdown (XSS-safe)
lib/view-html.mjs    renderers: dir/list + file (md/docx/pdf) + diff; ?embed=1 strips chrome
lib/docx.mjs         host-side .docx → safe markdown (mammoth)
lib/git.mjs          read-mostly git façades (branch/status/log/blame/gated commit)
lib/search.mjs       ripgrep workspace search engine (NDJSON stream)
lib/highlight.mjs    host-side Shiki syntax highlighting (pure-JS engine)
lib/watch.mjs        chokidar workspace watcher (live file watching)
lib/ws-server.mjs    /browser/ws downlink-only WebSocket (auth-fenced)
lib/client.js        pre-built client-plugin bundle (committed; DSH serves it)
client/index.tsx     client-plugin: produced chips + diff spill + dock
client/theme-*.ts    theme presets + controller (dock theme switcher)
client/search-text.ts pure XSS-safe snippet helpers (search results)
scripts/build-client.mjs  esbuild → __ModuleLoader__.load wire format
scripts/build-pdfjs.mjs   pdfjs-viewer-element dist → assets/pdfjs
assets/pdfjs/        served at /browser/vendor/pdfjs/* (basename+resolve guard)
cordis.patch.yml     plugin config (workspaceRoot, per-feature settings, …)
release.config.mjs   semantic-release, GitHub-only (npmPublish:false)
```

## Git & release workflow (IMPORTANT)

- **`dev` is the development trunk** — all feature work lands here.
- **`main` is stable** — only via **PR from `dev`** (or a fix branch → main for
  hotfixes, still via PR).
- **Feature branches** branch from `dev` (e.g. `feat/<name>`), and merge **back
  into dev via PR** — never push directly to dev or main.
- **Pull before every task**: before starting ANY task, sync with the freshest
  dev first (`git checkout dev && git pull origin dev`), then branch from it.
  Never start from a stale branch.
- **One branch per task; chain branches to avoid conflicts.** When many tasks
  are developed in one batch before a single PR, create a chain: task's branch
  `feat/b` branches off the PREVIOUS task's branch `feat/a` (not off `dev`
  again). This keeps merge conflicts away when the chain of PRs lands. Merge
  order matters: `feat/a` → dev first, then `feat/b` → dev, etc. Prefer merging
  each into dev in order so each PR is small and reviewable.
- When doing one big batch on a single long-running branch, rebase it onto the
  latest dev before opening the PR.
- Conventional commits (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`); `feat`/`fix`
  on main trigger a release.
- **NEVER merge a PR yourself. NEVER push directly to `dev` or `main`.**
  Only the repo owner merges, or an agent may merge strictly after the owner
  explicitly asked it to. Opening a PR is fine (and expected) — merging is not.
  Post the PR URL and wait. This rule also covers admin/`gh pr merge` calls:
  do not self-approve or self-merge a PR you opened.
- **Release = GitHub-only** (no npm): `release.config.mjs` uses
  `["@semantic-release/npm", { npmPublish:false, tarballDir:"dist" }]` +
  `["@semantic-release/github", { assets:["dist/*.tgz"] }]`. Pushing `feat`/`fix`
  to `main` → semantic-release tags `vX.Y.Z`, creates a GitHub Release with the
  packed tarball. No NPM_TOKEN. On `dev` it makes prereleases `vX.Y.Z-beta.N`.
- Seed tag `v0.0.0` sits on the squash commit so the first release is `0.1.0`.

### Branch protection (enabled)
Both `main` and `dev` require: 1 approving PR review + status checks (CI pass),
no force-push, no deletion. Every change lands via a reviewed PR.

### Branch chain example
```
dev ───────────────► (merged)
 │
 ├── feat/a ───────► PR #1 → dev
 │      │
 │      └── feat/b ────► PR #2 → dev   (branched off feat/a, not dev)
 │             │
 │             └── feat/c ─► PR #3 → dev
```

## Design & security constraints

- **Read-only viewer** — no write/deploy surface.
- **Every path** goes through `view-core.resolveWithin` (root guard + realpath):
  `..`, symlink escapes, and absolute paths outside root → `403`.
- **Untrusted file content** (markdown/docx) only ever rendered via the XSS-safe
  pipeline (`escapeHtml` / `renderMarkdown`) — never raw HTML injection.
- **Remote is the primary target** — data flows over the HTTP `/browser` route
  (works from localhost, LAN, Tailscale, Cloudflare tunnel). The dock uses
  `slot details` (priority -1); its shadowing trade-off replaces DSH's built-in
  DetailsPanel (tool-details view) — accepted.

## Pre-PR check — never leak internal details (REQUIRED)

This repo is **PUBLIC**. The real hostnames, service names, ports, and machine
paths of the owner's deployment live only in `AGENTS.local.md` (gitignored).
Before opening ANY PR (or pushing any commit), verify the committed files do
not leak internal details:

- Run the leak scanner and fix any hit before committing:
  ```sh
  NODE_OPTIONS= node scripts/check-public-leaks.mjs
  # (patterns come from DSH_FILE_PANE_LEAK_PATTERNS env; on the owner's
  #  machine set it from AGENTS.local.md, e.g. the real hostname/service/path)
  ```
- Never commit values from `AGENTS.local.md` into tracked files: real
  hostnames (`*.internal`, tunnel domains), systemd service names, ports,
  `~/…` machine paths, Cloudflare/`*.cloudflareaccess.com` identities, or the
  owner's username.
- Placeholders like `<YOUR_DOMAIN>`, `dsh-file-pane-web`, `/home/user`, and
  `~/Code/…` are the public-safe spellings to use instead.
- When a doc/comment/script needs a real value to run locally, read it from an
  environment variable (e.g. `DSH_FILE_PANE_SERVICE`) or from
  `AGENTS.local.md` — never hardcode it into a committed file.

## Reports / decisions (in repo, local-only files are gitignored)

- `plans/research/` — research reports (seam, expand, in-app dock).
- `plans/reports/` — brainstorm contracts + xia comparisons.
- `HANDOFF-next-session.md` — local session handoff, **never committed**
  (gitignored).
- `AGENTS.local.md` — real deployment details (hostnames, ports, service
  names, machine paths), **never committed** (gitignored).
