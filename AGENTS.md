# AGENTS.md — dsh-file-pane

Agent context for DeepSeek Harness (DSH) plugin development on this repo.
Read this first. It is the source of truth for conventions, environment facts,
and the Git/release workflow.

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
- **Production service:** systemd `deepseek-harness-web`, port 3080. Remote access
  via Cloudflare `harness.nes.codes` → loopback proxy :3081 → DSH :3080. Live
  only for verify; test changes in a sandbox profile (:3090) first.
- `web_search` WORKS (has key) — research online is fine.

## Commands (dev loop)

```sh
NODE_OPTIONS= npm test               # 38 tests: smoke + client contract + diff + expand (env/abs/docx/pdfjs)
NODE_OPTIONS= npm run build          # build:client (esbuild) + build:assets (pdfjs-viewer-element)
NODE_OPTIONS= npm run build:client   # client/index.tsx → lib/client.js (lib/client.js MUST be committed)
NODE_OPTIONS= npm run build:assets   # copy node_modules/pdfjs-viewer-element/dist → assets/pdfjs
NODE_OPTIONS= npm pack --dry-run     # verify publishable tarball
NODE_OPTIONS= npm run check          # import lib/index.js sanity
```

## Architecture

```
lib/index.js         host: /browser route + spill API + vendor pdfjs assets
lib/view-core.mjs    security core (resolveWithin abs→rel) + diffSides + renderMarkdown (XSS-safe)
lib/view-html.mjs    renderers: dir/list + file (md/docx/pdf) + diff; ?embed=1 strips chrome
lib/docx.mjs         host-side .docx → safe markdown (mammoth)
lib/client.js        pre-built client-plugin bundle (committed; DSH serves it)
client/index.tsx     client-plugin: produced chips + diff spill + dock
scripts/build-client.mjs  esbuild → __ModuleLoader__.load wire format
scripts/build-pdfjs.mjs   pdfjs-viewer-element dist → assets/pdfjs
assets/pdfjs/        served at /browser/vendor/pdfjs/* (basename+resolve guard)
cordis.patch.yml     workspaceRoot via env DSH_FILE_PANE_ROOT
release.config.mjs   semantic-release, GitHub-only (npmPublish:false)
```

## Git & release workflow (IMPORTANT)

- **`dev` is the development trunk** — all feature work lands here.
- **`main` is stable** — only via **PR from `dev`** (or a fix branch → main for
  hotfixes, still via PR).
- **Feature branches** branch from `dev` (e.g. `feat/<name>`), and merge **back
  into dev via PR** — never push directly to dev or main.
- Conventional commits (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`); `feat`/`fix`
  on main trigger a release.
- **Release = GitHub-only** (no npm): `release.config.mjs` uses
  `["@semantic-release/npm", { npmPublish:false, tarballDir:"dist" }]` +
  `["@semantic-release/github", { assets:["dist/*.tgz"] }]`. Pushing `feat`/`fix`
  to `main` → semantic-release tags `vX.Y.Z`, creates a GitHub Release with the
  packed tarball. No NPM_TOKEN. On `dev` it makes prereleases `vX.Y.Z-beta.N`.
- Seed tag `v0.0.0` sits on the squash commit so the first release is `0.1.0`.

### Branch protection reminder
`squash merge` (or at least: PRs only) on both `main` and `dev` is recommended
via GitHub Settings → Branches → Add rule. Prefer **squash** when merging
feature branches into dev to keep history clean.

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

## Reports / decisions (in repo, local-only HANDOFF is gitignored)

- `plans/research/` — research reports (seam, expand, in-app dock).
- `plans/reports/` — brainstorm contracts + xia comparisons.
- `HANDOFF-next-session.md` — local session handoff, **never committed**
  (gitignored).
