/**
 * dsh-file-pane — client-plugin (browser half).
 *
 * The tabbed-workbench UI pattern is adapted from omdsh-dev/DSH-better-sidebar
 * (MIT, https://github.com/omdsh-dev/DSH-better-sidebar). It is ported to
 * dsh-file-pane's read-only remote-viewer model: no editor / terminal /
 * git-write / subagent surfaces are carried over — only the tabbed file
 * viewing, explorer, and service-first extension point.
 * Original © omdsh-dev (MIT). This adaptation © dsh-file-pane contributors (MIT).
 *
 * Registers a `conversation.chat.turnTail` chain entry that SUPERSEDES the
 * built-in "Produced" row for remote (non-loopback) viewers: clicking a
 * produced-file chip navigates to the dsh-file-pane viewer route
 * (`/browser/?path=<workspace-relative>`) instead of calling the Host OS
 * opener (`host.openPath`), which is meaningless when DSH is reached from
 * another device.
 *
 * Chain selector ordering (`priority` ascending, lower tries first): a -1
 * priority runs BEFORE the built-in deliverables entry (priority 0), so when
 * this entry matches the built-in row does not render — no duplicate.
 *
 * On loopback it declines (returns null) so the built-in Host-open behavior
 * is untouched locally. Reuses the same forward/independent contract as the
 * in-repo deliverable: paths come from `owner.turn.data.get("deliverables")`
 * (`{ produced: [{ seq, path }] }`), first-seen order, deduped, filtered to
 * `seq <= owner.seq`. This is derived here (not imported cross-plugin — the
 * DSH client module system forbids value imports between plugin bundles).
 *
 * The produced `path` is workspace-relative (the chat view resolves it
 * against the session cwd), which maps 1:1 onto the file-pane's
 * `?path=` slot whenever the pane's `workspaceRoot` is the session workspace.
 */

// Bundled platform constants (no cross-plugin value imports; kept local).
import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createThemeController, resolveInitialPreset } from "./theme-controller";
import { presetIds } from "./theme-presets";
import { splitHighlight } from "./search-text";

const LOADER_ID = "dsh-file-pane";
export const name = LOADER_ID;
const NS = "dsh-file-pane";

/** Window event the produced-file chips dispatch to open a file in the dock. */
const DOCK_OPEN_EVENT = "dsh-file-pane:open";
/** Persisted dock open/closed preference key. */
const DOCK_STORAGE_KEY = "dsh.filePane.dock";
/** Persisted theme preset choice key (survives reload; mirrors DOCK_STORAGE_KEY). */
const THEME_STORAGE_KEY = "dsh.filePane.theme";
/** Live mount flag: set by the dock while it is mounted (session-scoped). */
let dockMounted = false;
function isDockMounted() { return dockMounted; }

/**
 * Services this client plugin needs BEFORE `apply` runs. The cordis fiber
 * resolves this list against the root context and only activates the plugin
 * when every service is provided — without it the bundle can activate before
 * `slots`/`locale`/`connection` exist and `apply` throws (boot failure screen
 * "Failed to load plugins: dsh-file-pane").
 *
 * `layout` is required by the in-app dock (details column actions) — dropping
 * it makes `ctx.layout` undefined and the dock silently abdicates, so apply
 * throws loudly instead (same discipline as dsh-better-sidebar-lite).
 */
export const inject = ["slots", "locale", "connection", "conversationEvents", "sessions", "layout", "theme"];

/** Trailing segment of a slash-or-backslash path. */
function basename(p) {
  const at = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return at === -1 ? p : p.slice(at + 1);
}

/**
 * Stable tab id for a (session, path) pair — opened files dedupe per session so
 * re-opening the same file focuses its existing tab instead of stacking copies.
 */
function tabKey(sid, p) {
  return "t:" + (sid ?? "") + ":" + (p ?? "");
}

/** Image extensions we can preview natively (inline <img>) instead of iframing. */
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i;
function isImagePath(p) {
  return IMAGE_EXT.test(p ?? "");
}
/** Raw-byte URL for an image (host serves bytes; resolveWithin keeps it in-root). */
function rawSrc(p, workspace) {
  let q = "/browser/?path=" + encodeURIComponent(p ?? "") + "&raw=1";
  if (workspace) q += "&workspace=" + encodeURIComponent(workspace);
  return q;
}

/** Persisted tab list (session-isolated via the store key). */
const TAB_STORE_KEY = "dsh.filePane.tabs.v1";
function loadTabs() {
  try {
    const raw = globalThis.localStorage?.getItem(TAB_STORE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return Array.isArray(o?.tabs) ? o : null;
  } catch {
    return null;
  }
}
function saveTabs(tabs, activeId) {
  try {
    globalThis.localStorage?.setItem(TAB_STORE_KEY, JSON.stringify({ tabs, activeId }));
  } catch {
    /* storage may be unavailable (private mode) — tabs just won't persist */
  }
}

/**
 * The `ctx.filePane` extension service (service-first pattern ported from
 * DSH-better-sidebar's `ctx.betterSidebar`): other plugins register read-only
 * tabs / file viewers that appear in our workbench. Read-only by contract —
 * no editor / terminal / git-write / subagent surfaces are exposed.
 *
 * @typedef {{ id: string, title?: string, component?: any, closable?: boolean }} FilePaneTab
 * @typedef {{ id: string, extensions: string[], component?: any }} FilePaneViewer
 */
function createFilePaneService() {
  /** @type {FilePaneTab[]} */
  const tabs = [];
  /** @type {FilePaneViewer[]} */
  const viewers = [];
  const listeners = new Set();
  const emit = () => { for (const l of listeners) { try { l(); } catch { /* ignore subscriber errors */ } } };
  return {
    version: "0.1.0",
    /** Register a read-only workbench tab. Returns a disposer. */
    registerTab(descriptor) {
      const d = {
        id: String(descriptor.id),
        title: String(descriptor.title ?? descriptor.id),
        component: descriptor.component,
        closable: descriptor.closable !== false,
      };
      tabs.push(d); emit();
      return () => { const i = tabs.indexOf(d); if (i >= 0) tabs.splice(i, 1); emit(); };
    },
    /** Register a file viewer for extensions (discovery point; read-only). */
    registerFileViewer(descriptor) {
      const d = {
        id: String(descriptor.id),
        extensions: Array.isArray(descriptor.extensions) ? descriptor.extensions : [],
        component: descriptor.component,
      };
      viewers.push(d); emit();
      return () => { const i = viewers.indexOf(d); if (i >= 0) viewers.splice(i, 1); emit(); };
    },
    /** Close a plugin-registered tab by id (used by the tab's × button). */
    closeTab(id) {
      const i = tabs.findIndex((tt) => tt.id === id);
      if (i >= 0) { tabs.splice(i, 1); emit(); }
    },
    getTabs: () => tabs.slice(),
    getViewers: () => viewers.slice(),
    subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
  };
}

/**
 * Resolve a deliverable path against a session cwd into the pane's ?path= slot.
 *
 * Deliverable paths are workspace-relative to the session cwd (the built-in
 * `resolveWorkspacePath(cwd, path)` joins them the same way). The pane's
 * `workspaceRoot` may be any ancestor of that cwd, so passing the absolute
 * spelling lets the host relativize it against its root (lib/view-core
 * resolveWithin accepts absolute-under-root paths). When no cwd is known
 * (blank/new session), fall back to the raw relative path.
 */
function resolvePanePath(cwd, path) {
  if (!path) return path;
  if (path.startsWith("/") || /^[A-Za-z]:[/\\]/.test(path) || path.startsWith("\\\\")) return path;
  if (!cwd) return path;
  return `${cwd.replace(/[/\\]+$/, "")}/${path.replace(/^[/\\]+/, "")}`;
}

/**
 * Derive the produced paths for a closing turn, mirroring the built-in
 * `producedForClosing`. Reads the same `deliverables` turn data the
 * UI-deliverables plugin publishes (it owns the location index), so a file a
 * mutation tool wrote appears whether or not the model named it.
 */
function producedForClosing(data, seq = Number.POSITIVE_INFINITY) {
  if (data === undefined) return [];
  const paths = [];
  const seen = new Set();
  for (const pro of data.produced ?? []) {
    if (pro.seq > seq || seen.has(pro.path)) continue;
    seen.add(pro.path);
    paths.push(pro.path);
  }
  return paths;
}

/**
 * Narrow a tool result view's `diffs` to well-formed hunks
 * ({ path, oldText, newText }) — same shape the built-in DiffBlock draws.
 * Returns [] when the payload is not usable.
 */
function narrowDiffs(diffs) {
  if (!Array.isArray(diffs) || diffs.length === 0) return [];
  const out = [];
  for (const hunk of diffs) {
    if (typeof hunk !== "object" || hunk === null) continue;
    const { path, oldText, newText } = hunk;
    if (typeof path !== "string" || path.length === 0) continue;
    if (oldText !== null && typeof oldText !== "string") continue;
    if (typeof newText !== "string") continue;
    out.push({ path, oldText, newText });
  }
  return out;
}

/**
 * Spill one edit's before/after to the host (RAM, session-scoped) so the pane
 * can render a version diff. Fire-and-forget; failures never disturb the chat.
 */
function spillDiff(session, hunk) {
  if (!session) return;
  const body = { session, path: hunk.path, old: hunk.oldText, new: hunk.newText, ts: Date.now() };
  fetch("/browser/api/spill", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).catch(() => {});
}

/**
 * Turn-local accumulator: on each settled mutation tool result, spill the
 * before/after to the host for the CURRENTLY OPEN session. Publishing no view
 * node — this is a passive side channel feeding the pane's diff route.
 * `getSession` returns the currently open session id (from the sessions
 * service, bound by `apply` — callbacks do not carry a service context).
 */
function makeDiffSpillDefinition(getSession) {
  return {
    kind: "diff-spill",
    // Required by the events contract: target + buildViewNode must be declared
    // together. buildViewNode returns null — this definition publishes no view
    // node; it is a passive side channel whose update() spills to the host.
    target: "chat",
    buildViewNode: () => null,
    match: (event) => {
      if (event.type === "tool/call") return { id: String(event.data.callId), role: "update" };
      if (event.type === "tool/result") return { id: String(event.data.callId), role: "update" };
      return null;
    },
    start: (_context, match) => {
      if (match.event.type !== "tool/call") throw new Error("diff-spill start requires tool/call");
      return { callId: match.event.data.callId, view: match.view?.for === "call" ? match.view.view : null };
    },
    update: (context, match) => {
      if (match.event.type === "tool/call") {
        return { ...context.state, view: match.view?.for === "call" ? match.view.view : null };
      }
      if (match.event.type !== "tool/result") return context.state;
      if (match.event.data.message.content[0]?.isError === true) return context.state;
      // Prefer the result view when the event carries one (authoritative
      // before/after); fall back to the call view captured at tool/call.
      const view = match.view?.view ?? context.state.view;
      const hunks = narrowDiffs(view?.diffs);
      if (hunks.length === 0) return context.state;
      const current = getSession();
      for (const hunk of hunks) spillDiff(current, hunk);
      return context.state;
    }
  };
}

/**
 * Chain selector: claim the tail only when remote AND the turn produced files.
 * `isLoopback` is closed over from the plugin's connection service (the
 * selector's `owner` does not carry it). `matched` = produced-paths array.
 */
function selectProducedPane(isLoopback) {
  return function (owner) {
    if (isLoopback) return null; // leave the built-in Host-open row in charge locally
    const paths = producedForClosing(owner.turn.data.get("deliverables"), owner.seq);
    return paths.length === 0 ? null : paths;
  };
}

/**
 * Click a produced-file chip → open the file in the in-app dock (when the dock
 * is mounted — i.e. a session is current) or fall back to navigating the pane
 * route. The dock listens for the window event and loads the file; when the
 * dock is not mounted (blank session / not composed) we keep the old behavior.
 * The `getSession` accessor lets the dock carry the session so diff works.
 */
function openInPane(rel, resolvePath, getSession) {
  const path = resolvePath(rel);
  const session = typeof getSession === "function" ? getSession() : undefined;
  if (dockMounted) {
    window.dispatchEvent(new CustomEvent(DOCK_OPEN_EVENT, { detail: { path, session } }));
    return;
  }
  // Same tab preserves the session; a right-click / cmd-click still gets raw nav.
  const q = "/browser/?path=" + encodeURIComponent(path) + (session ? "&session=" + encodeURIComponent(session) : "");
  window.location.assign(q);
}

/* ── in-app dock (right details column, Option A1) ─────────────── */

/** Read the persisted open/closed preference; anything malformed defaults to open. */
function readDockOpen() {
  if (typeof localStorage === "undefined") return true;
  try {
    const raw = localStorage.getItem(DOCK_STORAGE_KEY);
    if (raw === null) return true;
    return JSON.parse(raw).open !== false;
  } catch { return true; }
}

function persistDockOpen(open) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify({ open })); } catch { /* quota/denied */ }
}

/** The layout face the dock drives (open/close the details column). */
const layoutActions = {
  open() { this.layout?.openDetails?.(); },
  close() { this.layout?.closeDetails?.(); }
};

/**
 * Parent path of a dock path: strip the last segment (undefined when already
 * at the root). Pure + exported for tests.
 */
function upPath(p) {
  if (!p) return undefined;
  const at = p.lastIndexOf("/");
  if (at <= 0) return undefined;
  return p.slice(0, at);
}

/**
 * Split a path into clickable breadcrumb segments. Returns an array of
 * { label, path } where `path` is the clickable ancestor prefix (undefined for
 * the workspace root). Pure + exported for tests.
 */
function breadcrumbParts(p) {
  if (!p) return [{ label: "workspace", path: undefined }];
  const out = [];
  const segs = p.split("/");
  let acc = "";
  for (let i = 0; i < segs.length; i++) {
    acc = i === 0 ? segs[i] : acc + "/" + segs[i];
    out.push({ label: segs[i], path: acc });
  }
  return out;
}

/**
 * Strip the workspace base prefix from an absolute dock path, returning the
 * workspace-relative spelling suitable for the breadcrumb/Up display. When
 * `base` is unknown or `p` lies outside it, `p` is returned unchanged. Pure.
 */
function stripBase(p, base) {
  if (!p) return undefined;
  if (!base) return p;
  if (p === base) return undefined;
  if (p.startsWith(base + "/")) return p.slice(base.length + 1);
  return p;
}

/** Dock last-location persist key (path + optional session, so diff works on reopen). */
const DOCK_STATE_KEY = "dsh.filePane.state";

function readDockState() {
  if (typeof localStorage === "undefined") return {}; // { path?, session? }
  try {
    const raw = localStorage.getItem(DOCK_STATE_KEY);
    const v = raw ? JSON.parse(raw) : {};
    return { path: typeof v.path === "string" ? v.path : undefined, session: typeof v.session === "string" ? v.session : undefined };
  } catch { return {}; }
}

function persistDockState(state) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(DOCK_STATE_KEY, JSON.stringify({ path: state.path ?? "", session: state.session ?? "" })); } catch { /* quota */ }
}

/** Fetch a directory listing as JSON (same origin). Returns entries or null. */
async function fetchListing(path, workspace) {
  try {
    const res = await fetch("/browser/?path=" + encodeURIComponent(path ?? "") + "&json=1" + (workspace ? "&workspace=" + encodeURIComponent(workspace) : ""));
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.entries) ? data.entries : null;
  } catch { return null; }
}

/**
 * Live-watch dirty-signal router (Phase 5). Given a `{type:"dirty", events}`
 * batch, decides WHICH existing HTTP refetch to run — targeted, never a
 * full-tree rescan:
 *   - a dirty rel at/under the current view root → subtree re-list (stamp bump);
 *   - any add/change/unlink kind → git-status refresh (dirty set changed);
 *   - the open file's rel dirty → iframe reload via setStamp.
 * Returns a promise resolving when the chosen refreshes settled. Pure / no
 * React state — exported so the client-contract tests can stub the fetchers.
 */
export async function refreshDirty(batch, { workspace, viewPath, base, fetchListingFn, fetchGitStatusFn, setStamp, onGitStatus }) {
  const events = Array.isArray(batch?.events) ? batch.events : [];
  if (events.length === 0) return;
  const rels = events.map((e) => e?.rel).filter((r) => typeof r === "string" && r.length > 0);
  const touch = (parent) => {
    if (!parent) return false;
    const p = String(parent);
    return rels.some((r) => r === p || r.startsWith(p + "/"));
  };
  const fetchList = fetchListingFn ?? fetchListing;
  const fetchGit = fetchGitStatusFn ?? fetchGitStatus;
  const viewRel = stripBase(viewPath, base); // workspace-relative spelling
  let reloadIframe = false;
  if (viewRel) reloadIframe = touch(viewRel);
  if (touch(viewRel || "")) {
    // subtree re-list: bump stamp (drives FileTree re-fetch + iframe)
    if (setStamp) setStamp((s) => s + 1);
    await fetchList(viewPath ?? base, base);
  }
  if (events.some((e) => e?.kind === "add" || e?.kind === "change" || e?.kind === "unlink")) {
    const d = await fetchGit(workspace);
    if (d && typeof onGitStatus === "function") onGitStatus(d);
  }
  if (reloadIframe && setStamp) setStamp((s) => s + 1);
}

/** Fetch the current branch + local branch list for a workspace. Returns null on error. */
async function fetchGitBranch(workspace) {
  if (!workspace) return null;
  try {
    const res = await fetch("/browser/api/git/branch?workspace=" + encodeURIComponent(workspace));
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** Fetch the git dirty-file set for a workspace. Returns null on error. */
async function fetchGitStatus(workspace) {
  if (!workspace) return null;
  try {
    const res = await fetch("/browser/api/git/status?workspace=" + encodeURIComponent(workspace));
    if (!res.ok) return null;
    const d = await res.json();
    return Array.isArray(d?.changes) ? d : null;
  } catch { return null; }
}

/** Switch the workspace to a branch (POST). Returns { ok, error?, current } or null. */
async function checkoutGitBranch(workspace, branch) {
  if (!workspace || !branch) return null;
  try {
    const res = await fetch("/browser/api/git/checkout?workspace=" + encodeURIComponent(workspace) + "&branch=" + encodeURIComponent(branch), { method: "POST" });
    return await res.json().catch(() => null);
  } catch { return null; }
}

/** Fetch the commit history (oneline list) for a workspace. Returns [] on error. */
async function fetchGitLog(workspace, limit = 100) {
  if (!workspace) return [];
  try {
    const res = await fetch("/browser/api/git/log?workspace=" + encodeURIComponent(workspace) + "&limit=" + limit);
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d?.entries) ? d.entries : [];
  } catch { return []; }
}

/** Fetch per-line blame for a file. Returns { capped, entries } or null. */
async function fetchGitBlame(workspace, path) {
  if (!workspace || !path) return null;
  try {
    const res = await fetch("/browser/api/git/blame?workspace=" + encodeURIComponent(workspace) + "&path=" + encodeURIComponent(path));
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** Post a local commit (gated server-side). Returns { ok, error? } or null. */
async function commitGit(workspace, message) {
  if (!workspace || !message) return null;
  try {
    const res = await fetch("/browser/api/git/commit?workspace=" + encodeURIComponent(workspace), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message })
    });
    return await res.json().catch(() => null);
  } catch { return null; }
}

/**
 * FileTree: a compact workspace file browser for the dock. Two-level lazy:
 * clicking a directory fetch+expands its children; clicking a file loads it
 * in the iframe. Sorted dirs-first, matching the pane listing.
 */
function FileTree({ path, onOpen, activePath, depth = 0, workspace }) {
  const [rows, setRows] = useState(null); // null = loading, [] = loaded
  const [open, setOpen] = useState(depth === 0); // root auto-expanded
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setErr(false); setRows(null);
    fetchListing(path, workspace).then((entries) => {
      if (cancelled) return;
      if (entries === null) { setErr(true); setRows([]); return; }
      const sorted = [...entries].sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name));
      setRows(sorted);
    }).catch(() => { if (!cancelled) { setErr(true); setRows([]); } });
    return () => { cancelled = true; };
  }, [open, path, workspace]);

  const toggle = (e) => { e.stopPropagation(); setOpen((o) => !o); };

  return (
    <ul className="dshfp-tree-l" style={{ paddingLeft: depth * 12 }}>
      <li className="dshfp-tree-row">
        <button className="dshfp-tree-node" type="button" onClick={toggle} data-dir="1">
          <span className="chev">{open ? "⌄" : "›"}</span>
          <span className="nm">{path ? basename(path) : "workspace"}</span>
        </button>
        {open ? (
          <ul className="dshfp-tree-c">
            {err ? <li className="dshfp-tree-empty">( failed to load )</li> : null}
            {rows === null && !err ? <li className="dshfp-tree-empty">( loading… )</li> : null}
            {(rows ?? []).map((e) => {
              const childPath = path ? path + "/" + e.name : e.name;
              if (e.dir) return <FileTree key={childPath} path={childPath} onOpen={onOpen} activePath={activePath} depth={depth + 1} workspace={workspace} />;
              return (
                <li key={childPath} className="dshfp-tree-row">
                  <button className="dshfp-tree-node" type="button" data-file="1" data-active={childPath === activePath || undefined} onClick={() => onOpen(childPath)}>
                    <span className="chev">·</span>
                    <span className="nm">{e.name}</span>
                  </button>
                </li>
              );
            })}
            {(rows ?? []).length === 0 && !err && rows !== null ? <li className="dshfp-tree-empty">( empty )</li> : null}
          </ul>
        ) : null}
      </li>
    </ul>
  );
}

/** Clickable path breadcrumb for the dock header (workspace / a / b / file). */
function Breadcrumb({ path, onNavigate }) {
  const parts = breadcrumbParts(path);
  return (
    <span className="dshfp-crumb" title={path ?? "workspace"}>
      {parts.map((part, i) => {
        const last = i === parts.length - 1;
        return (
          <span key={part.path ?? "root"} className="dshfp-crumb-part">
            {i > 0 ? <span className="dshfp-crumb-sep">/</span> : null}
            {last ? (
              <span className="dshfp-crumb-cur">{part.label}</span>
            ) : (
              <button type="button" className="dshfp-crumb-link" onClick={() => onNavigate(part.path)}>
                {part.label}
              </button>
            )}
          </span>
        );
      })}
    </span>
  );
}

/* ── Workspace search (dock Search section, via GET /browser/api/search NDJSON). ── */

/** Client-side row cap (belt-and-suspenders; server clamps max too). */
const SEARCH_ROW_CAP = 200;

/** Debounce delay for the search box. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Read an NDJSON response body incrementally, calling `onRecord` per parsed
 * line. Handles partial lines across chunk boundaries by buffering and splitting
 * on `\n`; malformed lines are skipped (never fatal).
 */
export async function readNdjson(body, onRecord) {
  if (!body) return;
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value ?? new Uint8Array(0), { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        try { onRecord(JSON.parse(line)); } catch { /* malformed line: ignore */ }
      }
    }
    if (buf.trim()) { try { onRecord(JSON.parse(buf.trim())); } catch { /* ignore */ } }
  } catch { /* aborted/network */ }
}

/**
 * Fetch a workspace search as NDJSON. Resolves once the stream is consumed.
 * Returns null on network/HTTP error (caller surfaces an inline message).
 */
export async function fetchSearch(ws, opts) {
  const p = new URLSearchParams();
  p.set("q", opts.q);
  p.set("workspace", ws);
  p.set("mode", opts.mode);
  p.set("max", String(opts.max ?? SEARCH_ROW_CAP));
  if (opts.case) p.set("case", opts.case);
  if (opts.globs) p.set("globs", opts.globs);
  try {
    const res = await fetch("/browser/api/search?" + p.toString(), { signal: opts.signal });
    if (!res.ok || !res.body) return null;
    await readNdjson(res.body, opts.onRecord);
    return true;
  } catch {
    if (opts.signal?.aborted) return null;
    return null;
  }
}

/** The dock Search panel: Name/Content toggle, debounced query, NDJSON results. */
function SearchSection({ ws, t, onOpen }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [mode, setMode] = useState("content");
  const [rows, setRows] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const abortRef = useRef(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const t2 = setTimeout(() => setDebounced(q.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t2);
  }, [q]);

  useEffect(() => {
    abortRef.current?.abort(); // cancel any in-flight search before starting a new one
    if (!debounced) { setRows([]); setCount(0); setTruncated(false); setErr(null); setLoading(false); return; }
    const ac = new AbortController();
    abortRef.current = ac;
    const seq = ++seqRef.current;
    setErr(null); setLoading(true); setRows([]); setCount(0); setTruncated(false);
    const pending = [];
    fetchSearch(ws, {
      q: debounced,
      mode,
      max: SEARCH_ROW_CAP,
      signal: ac.signal,
      onRecord: (rec) => {
        if (seq !== seqRef.current) return;
        if (rec.t === "match") {
          const key = rec.path + ":" + rec.line + ":" + (rec.col ?? 0);
          if (pending.length >= SEARCH_ROW_CAP) { setTruncated(true); ac.abort(); return; }
          if (!pending.some((r2) => r2.key === key)) { pending.push({ ...rec, key }); setCount((c) => c + 1); }
        } else if (rec.t === "done") {
          setTruncated(!!rec.truncated);
        } else if (rec.t === "error") {
          setErr(rec.message || "search error");
        }
      }
    }).finally(() => {
      if (seq === seqRef.current) { setLoading(false); setRows(pending.slice(0, SEARCH_ROW_CAP)); }
    });
    return () => { ac.abort(); };
  }, [debounced, mode, ws]);

  return (
    <div className="dshfp-search" data-dsh-file-pane-search="1">
      <div className="dshfp-search-bar">
        <input
          type="text"
          value={q}
          placeholder="Search workspace…"
          aria-label="Search workspace"
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="dshfp-search-mode">
          <button type="button" className={mode === "name" ? "on" : ""} onClick={() => setMode("name")}>Name</button>
          <button type="button" className={mode === "content" ? "on" : ""} onClick={() => setMode("content")}>Content</button>
        </div>
      </div>
      {loading ? <div className="dshfp-search-status">searching…</div> : null}
      {err ? <div className="dshfp-search-status dshfp-search-err">{err}</div> : null}
      {!loading && !err && rows.length === 0 && debounced
        ? <div className="dshfp-search-status">no matches</div>
        : null}
      {count > 0 ? <div className="dshfp-search-meta">{count} match{count === 1 ? "" : "es"}{truncated ? ` · showing first ${SEARCH_ROW_CAP}` : ""}</div> : null}
      <div className="dshfp-search-results">
        {rows.map((r) => (
          <button type="button" key={r.key} className="dshfp-sr" onClick={() => onOpen(r)}>
            <span className="dshfp-sr-path">{r.path}{r.line && mode === "content" ? <em>:{r.line}</em> : null}</span>
            {mode === "content" && r.text
              ? <span className="dshfp-sr-snippet" dangerouslySetInnerHTML={{ __html: splitHighlight(r.text, r.pre ?? "", r.post ?? "") }} />
              : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * DockRoot: the frame's right `details` column occupant (in-flow). The DSH
 * AppFrame reserves this column beside the conversation, so the conversation
 * resizes around the dock instead of it overlaying the UI — consistent with the
 * native DSH look. Contains a workspace-rooted file tree, breadcrumb nav, diff,
 * and the session changed-files list.
 */
function ThemePicker({ t, value, onChange }) {
  const ids = presetIds();
  return (
    <select
      className="dshfp-theme-picker"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      title={t?.("dock.theme") ?? "Theme"}
      aria-label={t?.("dock.theme") ?? "Theme"}
    >
      {ids.map((id) => (
        <option key={id} value={id}>
          {id === "dsh-default" ? (t?.("dock.themeDefault") ?? "DSH default") : id}
        </option>
      ))}
      <style>{`
        .dshfp-theme-picker{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));color:var(--dsw-alias-label-secondary,#c7ccd9);
          border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));border-radius:5px;font:inherit;font-size:12px;max-width:118px;
          padding:1px 4px;cursor:pointer}
        .dshfp-theme-picker:hover{border-color:var(--dsw-alias-border-l3,rgba(255,255,255,.2));color:var(--dsw-alias-label-primary,#eef1f8)}
      `}</style>
    </select>
  );
}

function DockRoot({ t, useSessions: _useSessions, useWorkspaces: _useWorkspaces, layout, getSession, getCwd, themeController, defaultTheme, filePane }) {
  const rootRef = useRef(null);
  const [path, setPath] = useState(undefined); // undefined → root listing
  const [session, setSession] = useState(undefined);
  const [diff, setDiff] = useState(false); // false = view, true = version diff
  const [open, setOpen] = useState(readDockOpen);
  const [showTree, setShowTree] = useState(true);
  const [treeHover, setTreeHover] = useState(false); // hover-reveal popup (file open, tree hidden)
  const [hoverAct, setHoverAct] = useState(null); // which activity the popup follows while hovering the rail (null=follow current view)
  const [stamp, setStamp] = useState(0);
  const [changeView, setChangeView] = useState(false); // sidebar shows Changes (VSCode Source-Control style) vs the file tree
  const [searchView, setSearchView] = useState(false); // sidebar shows the Search section instead of tree/changes
  const [changed, setChanged] = useState([]);
  const [git, setGit] = useState({ git: false, current: null, branches: [], write: false }); // branch state for the status bar
  const [branchOpen, setBranchOpen] = useState(false); // branch switcher dropdown
  const [themeId, setThemeId] = useState(() => {
    try { return globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? ""; } catch { return ""; }
  });
  const [gitErr, setGitErr] = useState(null);
  const [gitView, setGitView] = useState("changes"); // "changes" | "history" within the git activity
  const [history, setHistory] = useState([]); // commit oneline list
  const [commitMsg, setCommitMsg] = useState("");
  const [commitBusy, setCommitBusy] = useState(false);
  const [blameOn, setBlameOn] = useState(false); // blame gutter on the file view
  const [commitTarget, setCommitTarget] = useState(null); // { sha } → ?gitview=commit src
  const [watching, setWatching] = useState(true); // live-watch health (false → poll fallback)

  // Tabbed-workbench state (ported UI pattern from DSH-better-sidebar, read-only):
  // an ordered, deduped list of opened file paths. The active tab is the current
  // `path`; opening a file from the tree / produced chip / changes list appends a
  // tab (focusing it if already open). Persisted per page load so reopening the
  // dock restores the session's tabs.
  const [tabs, setTabs] = useState([]);
  const [activePluginId, setActivePluginId] = useState(null); // when set, a plugin-registered tab owns the editor
  const [pluginTabs, setPluginTabs] = useState([]); // tabs registered via ctx.filePane.registerTab
  // Dual-workbench (ported from DSH-better-sidebar's right + bottom panels): a
  // vertical split adds a BOTTOM pane that can hold its own file tabs, so two
  // files are visible at once. Read-only — both panes render via the secure
  // host /browser route.
  const [bottomTabs, setBottomTabs] = useState([]);
  const [bottomActiveId, setBottomActiveId] = useState(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitPct, setSplitPct] = useState(55); // top pane height %
  const [focusedPane, setFocusedPane] = useState("top"); // tree / produced-chip opens into this pane

  // Restore the last docked path/session once (before any user open).
  const seeded = useRef(false);

  // Open/close via the layout store (in-flow details column); persist preference.
  // On mount, open the column if we default to open.
  useEffect(() => {
    dockMounted = true;
    const initial = readDockState();
    if (initial.path !== undefined && !seeded.current) {
      seeded.current = true;
      setPath(initial.path);
      setSession(initial.session);
      setDiff(false);
    }
    if (open) layout?.openDetails?.();
    const onOpen = (e) => {
      const p = e.detail?.path;
      const s = e.detail?.session;
      seeded.current = true;
      setPath(p); setSession(s); setDiff(false);
      setShowTree(!p); // a produced-file open focuses the content (hide tree); root open shows the tree
      persistDockState({ path: p, session: s });
      setOpen(true); persistDockOpen(true); layout?.openDetails?.();
    };
    window.addEventListener(DOCK_OPEN_EVENT, onOpen);
    // Restore persisted tabs + active tab (ported from DSH-better-sidebar's
    // session-isolated layout persistence, trimmed to the tab list).
    const saved = loadTabs();
    if (saved) {
      setTabs(saved.tabs || []);
      const aId = saved.activeId;
      if (aId && (saved.tabs || []).some((tt) => tt.id === aId)) {
        const at = (saved.tabs || []).find((tt) => tt.id === aId);
        if (at && at.path !== undefined) { setPath(at.path); setSession(at.session); setShowTree(false); }
      }
    }
    return () => { dockMounted = false; window.removeEventListener(DOCK_OPEN_EVENT, onOpen); };
  }, [layout, open]);

  // Subscribe to plugin-registered tabs (ctx.filePane.registerTab) so external
  // read-only plugins surface as workbench tabs alongside our file tabs.
  useEffect(() => {
    if (!filePane) return;
    const sync = () => setPluginTabs(filePane.getTabs().slice());
    sync();
    return filePane.subscribe(sync);
  }, [filePane]);

  // Persist the tab list + active tab across reloads.
  useEffect(() => {
    const sid = typeof getSession === "function" ? getSession() : undefined;
    const aId = tabs.find((tt) => tt.path === path && tt.session === sid)?.id ?? null;
    saveTabs(tabs, aId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, path]);

  const toggle = useCallback((next) => {
    setOpen(next); persistDockOpen(next);
    if (next) layout?.openDetails?.(); else layout?.closeDetails?.();
  }, [layout]);

  // Ctrl/Cmd+Shift+B toggles the dock.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyB") {
        e.preventDefault();
        setOpen((o) => {
          const next = !o;
          persistDockOpen(next);
          if (next) layout?.openDetails?.(); else layout?.closeDetails?.();
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout]);

  // Git: current branch + branch list for the status bar (workspace = active cwd).
  useEffect(() => {
    const ws = typeof getCwd === "function" ? getCwd() : undefined;
    if (!ws) { setGit((g) => ({ ...g, git: false, current: null, branches: [] })); return; }
    let cancelled = false;
    fetchGitBranch(ws).then((d) => {
      if (cancelled || !d) return;
      setGit({ git: !!d.git, current: d.current ?? null, branches: Array.isArray(d.branches) ? d.branches : [], write: d.write === true });
    });
    return () => { cancelled = true; };
  }, [getCwd, session, getSession]);

  // History: fetch the commit oneline list when the History sub-view is active.
  useEffect(() => {
    if (gitView !== "history") return;
    const ws = typeof getCwd === "function" ? getCwd() : undefined;
    if (!ws) { setHistory([]); return; }
    let cancelled = false;
    fetchGitLog(ws, 100).then((entries) => { if (!cancelled) setHistory(Array.isArray(entries) ? entries : []); });
    return () => { cancelled = true; };
  }, [gitView, getCwd, session, stamp]);

  // Theme preset: on mount apply the persisted/config choice; on change apply +
  // persist. `themeId === ""` means no override (DSH default applied by clear).
  useEffect(() => {
    if (!themeController) return;
    if (!themeId) { themeController.clear(); return; }
    themeController.apply(themeId);
    try { globalThis.localStorage?.setItem(THEME_STORAGE_KEY, themeId); } catch { /* ignore */ }
  }, [themeId, themeController]);

  // First-mount: reconcile the persisted choice against the config seed.
  useEffect(() => {
    if (!themeController) return;
    let saved = "";
    try { saved = globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? ""; } catch { /* ignore */ }
    const id = saved || defaultTheme || "";
    if (id) setThemeId(id); else themeController.clear();
    return () => themeController.dispose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeController]);

  // Git changes (source-control style): while the Changes view is open, keep the
  // dirty-file set fresh. Live source is the /browser/ws push (Phase 5); the 4s
  // poll runs ONLY as fallback when WS is unavailable or watching:false (ENOSPC)
  // — push and poll never run simultaneously.
  useEffect(() => {
    if (!changeView) { setChanged([]); return; }
    const ws2 = typeof getCwd === "function" ? getCwd() : undefined;
    if (!ws2) return;
    let cancelled = false;
    const load = async () => {
      const c = await fetchGitStatus(ws2);
      if (cancelled || !c) return;
      setChanged(Array.isArray(c.changes) ? c.changes.map((e) => ({ path: e.path, status: e.status, staged: !!e.staged })) : []);
    };
    const onGitStatus = (d) => {
      if (cancelled) return;
      setChanged(Array.isArray(d?.changes) ? d.changes.map((e) => ({ path: e.path, status: e.status, staged: !!e.staged })) : []);
    };
    let liveSource = "push"; // "push" | "poll"
    const poll = () => {
      liveSource = "poll";
      load();
      const t = setInterval(load, watchFallbackMs);
      return () => clearInterval(t);
    };
    const startPoll = () => { if (liveSource !== "poll") pollCleanup = poll(); };
    let pollCleanup = null;
    // WS stub: connect with exponential backoff clamped to 1–30s.
    let sock = null, retry = 0, reconnectTimer = null;
    const connect = () => {
      if (cancelled || sock) return;
      try {
        const proto = (globalThis.location?.protocol === "https:") ? "wss:" : "ws:";
        sock = new WebSocket(proto + "//" + globalThis.location.host + "/browser/ws");
      } catch { startPoll(); return; }
      sock.onopen = () => { retry = 0; };
      sock.onmessage = (ev) => {
        let frame;
        try { frame = JSON.parse(ev.data); } catch { return; }
        if (frame?.type === "status") {
          if (frame.watching === false) { setWatching(false); startPoll(); }
          else { setWatching(true); if (liveSource === "poll" && pollCleanup) { pollCleanup(); pollCleanup = null; liveSource = "push"; } }
          return;
        }
        if (frame?.type === "dirty" && frame.workspace === ws2) {
          refreshDirty(frame, {
            workspace: ws2,
            viewPath: path,
            base: ws2,
            setStamp,
            onGitStatus
          });
        }
      };
      sock.onclose = () => {
        sock = null;
        if (cancelled) return;
        const delay = Math.min(1000 * Math.pow(2, retry), 30000);
        retry++;
        if (retry > 3) startPoll(); // WS unavailable after a few retries → poll
        reconnectTimer = setTimeout(connect, delay);
      };
      sock.onerror = () => { try { sock?.close(); } catch {} };
    };
    connect();
    // Fallback when the host signals watching:false (ENOSPC) — arm poll now.
    if (watching === false) { pollCleanup = poll(); }
    load(); // initial status load regardless
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { sock?.close(); } catch {}
      if (pollCleanup) pollCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeView, getCwd, session, git.current, stamp]);

  if (!open) return null;

  const effSession = session ?? (typeof getSession === "function" ? getSession() : undefined);
  // Workspace base = the current session's cwd (the folder being worked on).
  // The file tree + Home root here instead of the host root ($HOME) so the dock
  // shows only the active workspace, not the whole hosting machine.
  const base = typeof getCwd === "function" ? getCwd() : undefined;
  // Fallback poll interval (Phase 5): from DSH settings when surfaced, else 4000.
  const watchFallbackMs = 4000;
  const viewPath = path ?? base; // undefined path → the workspace root listing
  const src = commitTarget
    ? dockSrc(viewPath, { workspace: base, gitview: "commit", sha: commitTarget.sha })
    : dockSrc(viewPath, { diff, session: effSession, workspace: base, blame: blameOn });
  const needSessionNote = diff && isTextPath(viewPath) && effSession === undefined;
  const nav = (next) => { setPath(next); }; // navigating resets diff
  // Opening a file focuses the content and hides the tree (tab-like); the tree
  // stays reachable via a hover-reveal strip. Navigating to a dir re-shows it.
  // When the BOTTOM split pane is focused + open, the file opens there instead
  // of the TOP pane (dual-workbench). De-dupes per (session, path).
  const openFile = (p) => {
    const sid = effSession;
    const id = tabKey(sid, p);
    if (focusedPane === "bottom" && splitOpen) {
      setBottomTabs((prev) => (prev.some((t) => t.id === id) ? prev : [...prev, { id, title: basename(p), path: p, session: sid }]));
      setBottomActiveId(id); setShowTree(false);
      return;
    }
    setTabs((prev) => (prev.some((t) => t.id === id) ? prev : [...prev, { id, title: basename(p), path: p, session: sid }]));
    setPath(p); setDiff(false); setCommitTarget(null); setBlameOn(false); setShowTree(false); setActivePluginId(null);
    persistDockState({ path: p, session: sid });
  };
  // Close a bottom-pane tab; if it was active, fall back to a neighbour or clear.
  const closeBottomTab = (id) => {
    setBottomTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const next = prev.slice(); next.splice(idx, 1);
      if (id === bottomActiveId) {
        const neighbour = next[idx] || next[idx - 1] || null;
        setBottomActiveId(neighbour ? neighbour.id : null);
      }
      return next;
    });
  };
  // Toggle the vertical split; when enabling with no bottom file yet, seed the
  // bottom pane from the current top file so two panes appear immediately.
  const toggleSplit = () => {
    setSplitOpen((open) => {
      const next = !open;
      if (next && !bottomActiveId && path) {
        setBottomTabs([{ id: tabKey(effSession, path), title: basename(path), path, session: effSession }]);
        setBottomActiveId(tabKey(effSession, path));
      }
      if (!next) setBottomTabs([]);
      return next;
    });
  };
  // Drag the splitter to resize the top/bottom panes (clamped 20–80%).
  const startSplitDrag = (e) => {
    e.preventDefault();
    const editor = rootRef.current?.querySelector(".dshfp-editor");
    if (!editor) return;
    const rect = editor.getBoundingClientRect();
    const move = (ev) => {
      const pct = ((ev.clientY - rect.top) / rect.height) * 100;
      setSplitPct(Math.max(20, Math.min(80, pct)));
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  // Close a file tab; if it was active, fall back to a neighbour or the Files root.
  const closeTab = (id) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const closed = prev[idx];
      const next = prev.slice(); next.splice(idx, 1);
      if (closed.path === path && closed.session === effSession) {
        const neighbour = next[idx] || next[idx - 1] || null;
        if (neighbour) {
          setPath(neighbour.path); setSession(neighbour.session); setDiff(false); setCommitTarget(null); setBlameOn(false); setShowTree(false); setActivePluginId(null);
          persistDockState({ path: neighbour.path, session: neighbour.session });
        } else {
          setPath(undefined); setSession(undefined); setShowTree(true); setActivePluginId(null);
        }
      }
      return next;
    });
  };
  const navDir = (p) => { setPath(p); setDiff(false); setShowTree(true); }; // dir/root nav keeps the tree visible
  // VSCode-style activity toggle: clicking the ACTIVE view's icon collapses the
  // panel back to the rail; clicking it again (or another icon) opens/switches.
  const onAct = (v) => {
    if (showTree && changeView === v) setShowTree(false);
    else { setChangeView(v); setShowTree(true); }
    setSearchView(false);
  };
  // Search activity: clicking it collapses if already open, else shows Search.
  const onActSearch = () => {
    if (showTree && searchView) setShowTree(false);
    else { setChangeView(false); setSearchView(true); setShowTree(true); }
  };
  // Open a search result in the pane (result.path is workspace-relative).
  const openSearchResult = (r) => {
    const p = typeof r?.path === "string" ? r.path : "";
    openFile(base && p ? base + "/" + p.replace(/^\/+/, "") : p);
  };
  // Switch branch via the server, then refresh branch + dirty set + the iframe.
  const doCheckout = async (b) => {
    setBranchOpen(false); setGitErr(null);
    const ws = typeof getCwd === "function" ? getCwd() : undefined;
    if (!ws || b === git.current) return;
    const r = await checkoutGitBranch(ws, b);
    const d = await fetchGitBranch(ws);
    if (d) setGit({ git: !!d.git, current: d.current ?? null, branches: Array.isArray(d.branches) ? d.branches : [] });
    if (r && !r.ok) setGitErr(r.error || "checkout failed");
    setStamp((s) => s + 1); // reload the iframe (path may have moved / tree refresh)
  };
  const relC = stripBase(viewPath, base);    // path relative to the workspace (for breadcrumb/Up)
  const upRel = upPath(relC);                // parent relative to the workspace (undefined = at base)
  const navClose = (rel) => nav(base && rel ? base + "/" + rel.replace(/^\/+/, "") : base ?? undefined);
  // History: open a commit's file diff in the iframe (?gitview=commit&sha=).
  const openCommit = (sha) => {
    if (!sha || !viewPath) return;
    setPath(viewPath); // keep current file as the diff target
    setDiff(false); setBlameOn(false);
    // Set a pending commit target via a small state so src recomputes below.
    setCommitTarget({ sha });
    setStamp((s) => s + 1);
  };
  // Local commit (gated: only visible when git.write === true).
  const doCommit = async () => {
    const ws = typeof getCwd === "function" ? getCwd() : undefined;
    if (!ws || !commitMsg.trim()) return;
    setCommitBusy(true); setGitErr(null);
    const r = await commitGit(ws, commitMsg.trim());
    setCommitBusy(false);
    if (r && !r.ok) { setGitErr(r.error || "commit failed"); return; }
    setCommitMsg("");
    const d = await fetchGitBranch(ws);
    if (d) setGit({ git: !!d.git, current: d.current ?? null, branches: Array.isArray(d.branches) ? d.branches : [], write: d.write === true });
    setStamp((s) => s + 1);
  };
  return (
    <div
      ref={rootRef}
      data-dsh-file-pane-dock="1"
      role="region"
      aria-label={t?.("dock.title") ?? "File pane"}
      className="dshfp-dock"
    >
      <style>{`
        .dshfp-dock{display:flex;flex-direction:column;height:100%;min-width:0;overflow:hidden;background:var(--dsw-alias-bg-base,#0f1117);color:var(--dsw-alias-label-primary,#eef1f8);font:13px/1.4 ui-monospace,Menlo,Consolas,monospace;border-left:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12))}
        .dshfp-dock *{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l3,rgba(255,255,255,.18)) transparent}
        .dshfp-dock *::-webkit-scrollbar{width:9px;height:9px}
        .dshfp-dock *::-webkit-scrollbar-track{background:transparent}
        .dshfp-dock *::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l3,rgba(255,255,255,.2));border-radius:6px;border:2px solid var(--dsw-alias-bg-base,#0f1117)}
        .dshfp-dock *::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-state-business-primary,#5b96ff)}
        .dshfp-dock *::-webkit-scrollbar-corner{background:transparent}
        .dshfp-dock-head{display:flex;align-items:center;gap:4px;padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));flex:none;min-height:34px;flex-wrap:wrap}
        .dshfp-dock-head .t{font-weight:600;color:var(--dsw-alias-label-primary,#eef1f8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1;padding:0 4px}
        .dshfp-dock-head button{background:none;border:0;color:var(--dsw-alias-label-secondary,#c7ccd9);cursor:pointer;padding:3px 6px;border-radius:5px;font:inherit;line-height:1;display:inline-flex;align-items:center}
        .dshfp-dock-head button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-dock-head button:disabled{opacity:.35;cursor:default;background:none}
        .dshfp-dock-head button[data-on]{color:var(--dsw-alias-state-business-primary,#5b96ff);outline:1px solid currentColor;outline-offset:-1px}
        .dshfp-dock-note{background:rgba(255,191,0,.08);color:var(--dsw-alias-state-warn-primary,#f0b386);padding:4px 8px;font-size:11px;line-height:1.4;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));flex:none}
        .dshfp-dock-body{display:flex;flex:1;min-height:0}
        .dshfp-dock-tree{width:180px;min-width:180px;border-right:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));overflow:auto;padding:4px 0;flex:none}
        .dshfp-side{display:flex;flex-direction:row;width:230px;min-width:0;flex:none;overflow:hidden;transition:width .18s ease}
        .dshfp-side.closed{width:30px;position:relative;overflow:visible}
        .dshfp-rail{width:30px;flex:none;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 0;border-right:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));background:var(--dsw-alias-bg-base,#0f1117);overflow:hidden}
        .dshfp-act{background:none;border:0;color:var(--dsw-alias-label-tertiary,#9aa3b5);cursor:pointer;padding:3px 5px;border-radius:5px;display:inline-flex;align-items:center;flex:none;line-height:1}
        .dshfp-act:hover{color:var(--dsw-alias-label-primary,#eef1f8);background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}
        .dshfp-act[data-on]{color:var(--dsw-alias-state-business-primary,#5b96ff);background:transparent;box-shadow:inset 2px 0 0 var(--dsw-alias-state-business-primary,#5b96ff)}
        .dshfp-sp{flex:1}
        .dshfp-panel{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
        .dshfp-panel .dshfp-dock-tree{width:100%;min-width:0;flex:1;border-right:0;overflow:auto}
        .dshfp-tree-pop{position:absolute;left:100%;top:0;bottom:0;width:200px;background:var(--dsw-alias-bg-base,#0f1117);border-right:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));box-shadow:6px 0 16px rgba(0,0,0,.35);z-index:19;overflow:auto}
        .dshfp-changes{display:flex;flex-direction:column;gap:0}
        .dshfp-changes-head{padding:5px 8px 3px;font-family:var(--dsw-alias-font-sans,ui-monospace,Menlo,Consolas,monospace);font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--dsw-alias-label-tertiary,#9aa3b5);flex:none}
        .dshfp-gv-toggle{display:inline-flex;gap:2px}
        .dshfp-gv-toggle button{background:none;border:0;color:var(--dsw-alias-label-tertiary,#9aa3b5);cursor:pointer;font:inherit;font-size:10px;text-transform:uppercase;letter-spacing:.08em;padding:1px 5px;border-radius:3px}
        .dshfp-gv-toggle button:hover{color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-gv-toggle button.on{color:var(--dsw-alias-state-business-primary,#5b96ff)}
        .dshfp-changes-list{overflow:auto;flex:1;min-height:0}
        .dshfp-history{overflow:auto;flex:1;min-height:0;padding:2px 4px}
        .dshfp-history-item{display:block;width:100%;text-align:left;background:none;border:0;cursor:pointer;padding:3px 6px;border-radius:4px;color:var(--dsw-alias-label-secondary,#c7ccd9);font:inherit;font-size:11px;line-height:1.4}
        .dshfp-history-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-history-short{color:var(--dsw-alias-state-business-primary,#5b96ff);font-size:11px}
        .dshfp-history-subj{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dshfp-history-meta{color:var(--dsw-alias-label-tertiary,#9aa3b5);font-size:10px}
        .dshfp-commit{display:flex;gap:4px;padding:5px 6px;border-top:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));flex:none}
        .dshfp-commit input{flex:1;min-width:0;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));color:var(--dsw-alias-label-primary,#eef1f8);border-radius:5px;padding:3px 6px;font:inherit;font-size:11px}
        .dshfp-commit input:focus{outline:none;border-color:var(--dsw-alias-state-business-primary,#5b96ff)}
        .dshfp-commit-btn{background:var(--dsw-alias-state-business-primary,rgba(91,150,255,.16));border:1px solid var(--dsw-alias-state-business-primary,#5b96ff);color:var(--dsw-alias-label-primary,#eef1f8);border-radius:5px;cursor:pointer;font:inherit;font-size:11px;padding:3px 8px;flex:none}
        .dshfp-commit-btn:disabled{opacity:.4;cursor:default}
        .dshfp-dock iframe{flex:1;width:100%;border:0;min-height:0;background:#0f1117}
        .dshfp-editor{display:flex;flex-direction:column;flex:1;min-width:0;min-height:0;overflow:hidden}
        .dshfp-tabs{display:flex;align-items:stretch;gap:0;flex:none;height:30px;background:var(--dsw-alias-bg-base,#0f1117);border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
        .dshfp-tabs::-webkit-scrollbar{height:0;display:none}
        .dshfp-tab{display:inline-flex;align-items:center;gap:5px;max-width:200px;padding:0 4px 0 10px;border-right:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));background:transparent;color:var(--dsw-alias-label-secondary,#c7ccd9);cursor:pointer;font:inherit;font-size:12px;line-height:1;white-space:nowrap;user-select:none}
        .dshfp-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-tab.on{background:var(--dsw-alias-bg-elevated,#161922);color:var(--dsw-alias-label-primary,#eef1f8);box-shadow:inset 0 2px 0 var(--dsw-alias-state-business-primary,#5b96ff)}
        .dshfp-tab-nm{overflow:hidden;text-overflow:ellipsis}
        .dshfp-tab-x{background:none;border:0;color:inherit;opacity:.55;cursor:pointer;font-size:11px;line-height:1;padding:1px 3px;border-radius:3px;flex:none}
        .dshfp-tab-x:hover{opacity:1;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.18));color:var(--dsw-alias-state-danger-primary,#ff6b6b)}
        .dshfp-tab-empty{padding:16px;color:var(--dsw-alias-label-tertiary,#9aa3b5);font-size:12px}
        .dshfp-pane{display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden}
        .dshfp-splitter{height:6px;flex:none;cursor:row-resize;background:var(--dsw-alias-border-l2,rgba(255,255,255,.12));transition:background .12s ease}
        .dshfp-splitter:hover{background:var(--dsw-alias-state-business-primary,#5b96ff)}
        .dshfp-tab-empty-pill{padding:0 10px;color:var(--dsw-alias-label-tertiary,#9aa3b5);opacity:.7;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
        .dshfp-img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;margin:auto;object-fit:contain;padding:14px;background:var(--dsw-alias-bg-base,#0f1117);min-height:0}
        /* Mobile (<768px): the in-flow details column becomes a full-width
           overlay drawer (ported from DSH-better-sidebar's mobile behavior),
           toggled by the same footer button / Ctrl+Shift+B. Desktop unchanged. */
        @media (max-width: 768px) {
          .dshfp-dock{position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;z-index:1000;border-left:0}
          .dshfp-dock-head{flex-wrap:wrap}
          .dshfp-dock-tree{width:150px;min-width:150px}
        }
        .dshfp-tree-l{list-style:none;margin:0;padding:0}
        .dshfp-tree-c{list-style:none;margin:0;padding:0}
        .dshfp-tree-row .dshfp-tree-row{padding-left:2px}
        .dshfp-tree-node{display:flex;align-items:center;gap:4px;width:100%;background:none;border:0;color:var(--dsw-alias-label-secondary,#c7ccd9);cursor:pointer;padding:2px 6px;border-radius:4px;text-align:left;font:inherit;font-size:12px;line-height:1.5;overflow:hidden;white-space:nowrap}
        .dshfp-tree-node:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-tree-node[data-active]{background:var(--dsw-alias-state-business-primary,rgba(91,150,255,.18));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-tree-node .chev{flex:none;width:10px;color:var(--dsw-alias-label-tertiary,#9aa3b5)}
        .dshfp-tree-node .nm{overflow:hidden;text-overflow:ellipsis}
        .dshfp-tree-empty{color:var(--dsw-alias-label-tertiary,#9aa3b5);font-size:11px;padding:1px 8px}
        .dshfp-crumb{display:flex;align-items:center;gap:0;padding:0 4px;min-width:0;overflow:hidden;flex:1}
        .dshfp-crumb-part{display:inline-flex;align-items:center;gap:0;min-width:0}
        .dshfp-crumb-sep{color:var(--dsw-alias-label-tertiary,#9aa3b5);opacity:.7;padding:0 3px}
        .dshfp-crumb-link{background:none;border:0;color:var(--dsw-alias-label-secondary,#c7ccd9);cursor:pointer;font:inherit;line-height:1.3;padding:1px 3px;border-radius:4px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dshfp-crumb-link:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-crumb-cur{color:var(--dsw-alias-label-primary,#eef1f8);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dshfp-changed{flex:none;max-height:40%;overflow:auto;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));padding:4px 6px}
        .dshfp-changed-item{display:flex;align-items:center;gap:6px;width:100%;text-align:left;background:none;border:0;cursor:pointer;padding:2px 6px;border-radius:4px;color:var(--dsw-alias-label-secondary,#c7ccd9);font:inherit;font-size:12px;white-space:nowrap;overflow:hidden}
        .dshfp-changed-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-changed-item .nm{overflow:hidden;text-overflow:ellipsis}
        .dshfp-changed-dot{flex:none;width:18px;text-align:center;font-size:10px;font-weight:700;border-radius:3px;padding:0 2px;color:var(--dsw-alias-bg-base,#0f1117)}
        .dshfp-changed-dot[data-status="A"]{background:#2fbf71}
        .dshfp-changed-dot[data-status="M"]{background:#e8b341}
        .dshfp-changed-dot[data-status="D"]{background:#e5636a}
        .dshfp-changed-dot[data-status="R"],[data-status="C"]{background:#5b96ff}
        .dshfp-changed-dot[data-status="?"]{background:#9aa3b5}
        .dshfp-git{display:flex;flex-direction:column;gap:0}
        .dshfp-status{display:flex;align-items:center;gap:6px;padding:3px 8px;border-top:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));font-size:12px;color:var(--dsw-alias-label-tertiary,#9aa3b5);flex:none;position:relative;font-family:var(--dsw-alias-font-sans,ui-monospace,Menlo,Consolas,monospace)}
        .dshfp-status .dshfp-branch{display:inline-flex;align-items:center;gap:5px;background:none;border:0;color:var(--dsw-alias-label-secondary,#c7ccd9);cursor:pointer;font:inherit;font-size:12px;padding:1px 6px;border-radius:4px;max-width:170px}
        .dshfp-status .dshfp-branch:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-status .dshfp-branch-ic{color:var(--dsw-alias-state-business-primary,#5b96ff);flex:none}
        .dshfp-status .dshfp-branch-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
        .dshfp-status .dshfp-branch-meta{flex:none;opacity:.7}
        .dshfp-status .dshfp-branch-menu{position:absolute;bottom:calc(100% + 4px);left:4px;min-width:180px;max-width:240px;max-height:300px;overflow:auto;background:var(--dsw-alias-bg-base,#0f1117);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.18));border-radius:8px;box-shadow:0 -6px 24px rgba(0,0,0,.4);z-index:31;padding:4px}
        .dshfp-status .dshfp-branch-item{display:block;width:100%;text-align:left;background:none;border:0;color:var(--dsw-alias-label-secondary,#c7ccd9);cursor:pointer;font:inherit;font-size:12px;padding:4px 8px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .dshfp-status .dshfp-branch-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-status .dshfp-branch-item.on{color:var(--dsw-alias-state-business-primary,#5b96ff);font-weight:600}
        .dshfp-status .dshfp-branch-item.check{color:var(--dsw-alias-label-tertiary,#9aa3b5);border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08))}
        .dshfp-status-sp{flex:1}
        .dshfp-status-changes{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-state-warn-primary,#f0b386)}
        .dshfp-git-err{flex:none;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-state-danger-primary,#ff6b6b)}
        .dshfp-search{display:flex;flex-direction:column;gap:0;min-height:0}
        .dshfp-search-panel{width:230px;flex:none;border-right:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12))}
        .dshfp-search-head{padding:5px 8px 3px;font-family:var(--dsw-alias-font-sans,ui-monospace,Menlo,Consolas,monospace);font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--dsw-alias-label-tertiary,#9aa3b5);flex:none}
        .dshfp-search-bar{display:flex;align-items:center;gap:6px;padding:4px 6px;flex:none}
        .dshfp-search-bar input{flex:1;min-width:0;background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));color:var(--dsw-alias-label-primary,#eef1f8);border-radius:5px;padding:3px 6px;font:inherit;font-size:12px}
        .dshfp-search-bar input:focus{outline:none;border-color:var(--dsw-alias-state-business-primary,#5b96ff)}
        .dshfp-search-mode{display:flex;gap:2px;flex:none}
        .dshfp-search-mode button{background:none;border:0;color:var(--dsw-alias-label-tertiary,#9aa3b5);cursor:pointer;font:inherit;font-size:11px;padding:2px 6px;border-radius:4px}
        .dshfp-search-mode button:hover{color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-search-mode button.on{color:var(--dsw-alias-state-business-primary,#5b96ff);background:rgba(91,150,255,.12)}
        .dshfp-search-status{color:var(--dsw-alias-label-tertiary,#9aa3b5);font-size:11px;padding:0 8px;flex:none}
        .dshfp-search-status.dshfp-search-err{color:var(--dsw-alias-state-danger-primary,#ff6b6b)}
        .dshfp-search-meta{color:var(--dsw-alias-label-tertiary,#9aa3b5);font-size:10px;padding:2px 8px;flex:none}
        .dshfp-search-results{flex:1;min-height:0;overflow:auto;padding:2px 4px}
        .dshfp-sr{display:block;width:100%;text-align:left;background:none;border:0;cursor:pointer;padding:3px 6px;border-radius:4px;color:var(--dsw-alias-label-secondary,#c7ccd9);font:inherit;font-size:12px;line-height:1.45}
        .dshfp-sr:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-sr-path{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dshfp-sr-path em{font-style:normal;color:var(--dsw-alias-label-tertiary,#9aa3b5);margin-left:2px}
        .dshfp-sr-snippet{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#9aa3b5);font-size:11px}
        .dshfp-sr-snippet mark{background:rgba(232,179,65,.28);color:var(--dsw-alias-state-warn-primary,#f0b386);border-radius:2px;padding:0 1px}
      `}</style>
      <div className="dshfp-dock-head">
        <button type="button" title={t?.("dock.home") ?? "Files root"} onClick={() => { navDir(base); }}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 7 8 2.5 13.5 7"/><path d="M4 6.5V13h8V6.5"/></svg>
        </button>
        <button type="button" title={t?.("dock.up") ?? "Up one level"} disabled={!path || !upRel} onClick={() => { navDir(navClose(upRel)); }}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10.5 8 5.5l5 5"/></svg>
        </button>
        <button type="button" title={t?.("dock.reload") ?? "Reload"} onClick={() => setStamp((s) => s + 1)}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 3.5V7h-3.5"/><path d="M3 12.5V9h3.5"/><path d="M13 7a5 5 0 0 0-8.5-3.5L3 5M13 9l-1.5 1.5A5 5 0 0 1 3 7"/></svg>
        </button>
        <ThemePicker t={t} value={themeId || "dsh-default"} onChange={(id) => setThemeId(id)} />
        <Breadcrumb path={relC} onNavigate={(rel) => { navDir(navClose(rel)); }} />
        <button type="button" title={t?.("dock.diff") ?? "Version diff"} data-on={diff && isTextPath(path) || undefined} disabled={!isTextPath(path) || path === undefined} onClick={() => setDiff((v) => !v)}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h4M4 8h4M4 12h4"/><path d="M12 3.5v9"/><path d="M10.5 5.5 12 4l1.5 1.5M10.5 10.5 12 12l1.5-1.5"/></svg>
        </button>
        <button type="button" title={t?.("dock.blame") ?? "Blame"} data-on={blameOn || undefined} disabled={!isTextPath(path) || path === undefined} onClick={() => { setBlameOn((v) => !v); setDiff(false); setCommitTarget(null); }}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 5.5 8 2.5l5.5 3v6L8 14.5l-5.5-3z"/><path d="M8 8.5 13 5.5M8 8.5 3 5.5M8 8.5V14"/></svg>
        </button>
        <button type="button" title={"Split editor (top / bottom)"} data-on={splitOpen || undefined} onClick={toggleSplit}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3.5h10v4H3zM3 9.5h10v3H3z"/><path d="M3 7.5h10" stroke-dasharray="1.5 1.5"/></svg>
        </button>
        <button type="button" title={t?.("dock.openTab") ?? "Open in new tab"} onClick={() => window.open(src, "_blank", "noopener")}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.5 9.5 13 3"/><path d="M8.5 3H13v4.5"/><path d="M13 9v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H7"/></svg>
        </button>
        <button type="button" title={t?.("dock.close") ?? "Close pane"} onClick={() => toggle(false)}>✕</button>
      </div>
      {needSessionNote ? <div className="dshfp-dock-note">{t?.("dock.noSession") ?? "No session available for diff — open the file from a produced-file chip in chat first."}</div> : null}
      <div className="dshfp-dock-body">
        <div
          className={"dshfp-side" + (showTree ? "" : " closed")}
          onMouseLeave={() => { setTreeHover(false); setHoverAct(null); }}
        >
          <div className="dshfp-rail">
            <button type="button" className="dshfp-act" onMouseEnter={() => { setHoverAct(false); if (!showTree) setTreeHover(true); }} data-on={!changeView || undefined} title={t?.("dock.files") ?? "Files"} onClick={() => onAct(false)}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4.5a1 1 0 0 1 1-1h3l1.5 2H13a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/></svg>
            </button>
            <button type="button" className="dshfp-act" onMouseEnter={() => { setHoverAct(true); if (!showTree) setTreeHover(true); }} data-on={changeView || undefined} title={t?.("dock.git") ?? "Git / Changes"} onClick={() => onAct(true)}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h4M4 8h4M4 12h4"/><path d="M12 3.5v9"/><path d="M10.5 5.5 12 4l1.5 1.5M10.5 10.5 12 12l1.5-1.5"/></svg>
            </button>
            <button type="button" className="dshfp-act" onMouseEnter={() => { setHoverAct(false); if (!showTree) setTreeHover(true); }} data-on={searchView || undefined} title={t?.("dock.search") ?? "Search"} onClick={onActSearch}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/></svg>
            </button>
            <span className="dshfp-sp" />
            <button type="button" className="dshfp-act" title={showTree ? (t?.("dock.collapseTree") ?? "Collapse") : (t?.("dock.revealTree") ?? "Show")} onClick={() => setShowTree((v) => !v)}>
              {showTree
                ? <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4 6 8l5 4"/></svg>
                : <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4l5 4-5 4"/></svg>}
            </button>
          </div>
          {showTree ? (
            <div className="dshfp-panel">
              {searchView ? (
                <div className="dshfp-dock-tree dshfp-search" aria-label={t?.("dock.search") ?? "Search"}>
                  <div className="dshfp-search-head">{t?.("dock.search") ?? "Search"}</div>
                  <SearchSection ws={base} t={t} onOpen={openSearchResult} />
                </div>
              ) : changeView ? (
                <div className="dshfp-dock-tree dshfp-changes" aria-label={t?.("dock.git") ?? "Git"}>
                  <div className="dshfp-changes-head">
                    <span className="dshfp-gv-toggle">
                      <button type="button" className={gitView === "changes" ? "on" : ""} onClick={() => setGitView("changes")}>{t?.("dock.changesHead") ?? "Changes"}</button>
                      <button type="button" className={gitView === "history" ? "on" : ""} onClick={() => setGitView("history")}>{t?.("dock.history") ?? "History"}</button>
                    </span>
                  </div>
                  {gitView === "history" ? (
                    history.length === 0
                      ? <div className="dshfp-tree-empty">( no history )</div>
                      : <div className="dshfp-history">
                        {history.map((h) => (
                          <button type="button" key={h.sha} className="dshfp-history-item" data-sha={h.sha} onClick={() => openCommit(h.sha)}>
                            <code className="dshfp-history-short">{h.short}</code>
                            <span className="dshfp-history-subj">{h.subject}</span>
                            <span className="dshfp-history-meta">{(h.author ?? "").split(" ")[0]} · {(h.date ?? "").slice(0, 10)}</span>
                          </button>
                        ))}
                      </div>
                  ) : (
                    <div className="dshfp-changes-list">
                      {changed.length === 0
                        ? <div className="dshfp-tree-empty">( working tree clean )</div>
                        : changed.map((c) => (
                          <button type="button" key={c.path} className="dshfp-changed-item" onClick={() => { setPath(c.path); setDiff(true); setCommitTarget(null); setShowTree(false); const sid = effSession; if (sid) { setSession(sid); persistDockState({ path: c.path, session: sid }); } }}>
                            <span className="dshfp-changed-dot" data-status={c.status}>{c.status === "?" ? "?" : (c.status || "M")[0]}</span>
                            <span className="nm">{c.path}</span>
                          </button>
                        ))}
                      {git.write ? (
                        <div className="dshfp-commit">
                          <input
                            type="text"
                            value={commitMsg}
                            placeholder={t?.("dock.commitPlaceholder") ?? "Commit message…"}
                            disabled={commitBusy}
                            onChange={(e) => setCommitMsg(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") doCommit(); }}
                          />
                          <button type="button" className="dshfp-commit-btn" disabled={commitBusy || !commitMsg.trim()} onClick={doCommit}>
                            {t?.("dock.commit") ?? "Commit"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <nav className="dshfp-dock-tree" aria-label={t?.("dock.tree") ?? "File tree"}>
                  <FileTree path={base} workspace={base} onOpen={openFile} activePath={viewPath} />
                </nav>
              )}
            </div>
          ) : (
            searchView ? (
              <div className="dshfp-panel dshfp-search-panel">
                <div className="dshfp-dock-tree dshfp-search" aria-label={t?.("dock.search") ?? "Search"}>
                  <div className="dshfp-search-head">{t?.("dock.search") ?? "Search"}</div>
                  <SearchSection ws={base} t={t} onOpen={openSearchResult} />
                </div>
              </div>
            ) : (
              treeHover ? (
                <nav className="dshfp-dock-tree dshfp-tree-pop" aria-label={t?.("dock.tree") ?? "File tree"} onMouseEnter={() => setTreeHover(true)} onMouseLeave={() => setTreeHover(false)}>
                  {(hoverAct ?? changeView)
                    ? changed.length === 0
                      ? <div className="dshfp-tree-empty">( working tree clean )</div>
                      : changed.map((c) => (
                        <button type="button" key={c.path} className="dshfp-changed-item" onClick={() => { setPath(c.path); setDiff(true); setShowTree(false); const sid = effSession; if (sid) { setSession(sid); persistDockState({ path: c.path, session: sid }); } }}>
                          <span className="dshfp-changed-dot" data-status={c.status}>{c.status === "?" ? "?" : (c.status || "M")[0]}</span>
                          <span className="nm">{c.path}</span>
                        </button>
                      ))
                    : <FileTree path={base} workspace={base} onOpen={openFile} activePath={viewPath} />}
                </nav>
              ) : null
            )
          )}
        </div>
        <div className="dshfp-editor">
          {splitOpen ? (
            <>
              <div className="dshfp-pane" style={{ height: splitPct + "%" }} onMouseDown={() => setFocusedPane("top")}>
                <div className="dshfp-tabs" role="tablist" aria-label={t?.("dock.openTab") ?? "Open tabs"}>
                  {tabs.map((tt) => (
                    <div
                      key={tt.id}
                      className={"dshfp-tab" + (tt.path === path && tt.session === effSession && !activePluginId ? " on" : "")}
                      onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(tt.id); } }}
                      onClick={() => openFile(tt.path)}
                      title={tt.path ?? ""}
                    >
                      <span className="dshfp-tab-nm">{tt.title}</span>
                      <button type="button" className="dshfp-tab-x" onClick={(e) => { e.stopPropagation(); closeTab(tt.id); }} title={t?.("dock.close") ?? "Close"} aria-label={t?.("dock.close") ?? "Close"}>✕</button>
                    </div>
                  ))}
                  {pluginTabs.map((pt) => (
                    <div
                      key={"plugin:" + pt.id}
                      className={"dshfp-tab" + (activePluginId === pt.id ? " on" : "")}
                      onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); filePane?.closeTab?.(pt.id); } }}
                      onClick={() => { setActivePluginId(pt.id); setShowTree(false); }}
                      title={pt.title ?? pt.id}
                    >
                      <span className="dshfp-tab-nm">{pt.title ?? pt.id}</span>
                      {pt.closable !== false ? (
                        <button type="button" className="dshfp-tab-x" onClick={(e) => { e.stopPropagation(); filePane?.closeTab?.(pt.id); }} title={t?.("dock.close") ?? "Close"} aria-label={t?.("dock.close") ?? "Close"}>✕</button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {activePluginId ? (() => {
                  const pt = pluginTabs.find((x) => x.id === activePluginId);
                  if (!pt) return null;
                  const C = pt.component;
                  return C ? <C sessionId={effSession} /> : <div className="dshfp-tab-empty">{t?.("dock.noSession") ?? "No content"}</div>;
                })() : isImagePath(path) ? (
                  <img className="dshfp-img" src={rawSrc(path, base)} alt={path ?? ""} title={path ?? ""} />
                ) : (
                  <iframe key={path + ":" + diff + ":" + stamp} src={src} title={t?.("dock.title") ?? "File pane"} />
                )}
              </div>
              <div className="dshfp-splitter" onMouseDown={startSplitDrag} title="Drag to resize panes" role="separator" aria-orientation="horizontal" />
              <div className="dshfp-pane" style={{ height: (100 - splitPct) + "%" }} onMouseDown={() => setFocusedPane("bottom")}>
                <div className="dshfp-tabs" role="tablist" aria-label="Bottom tabs">
                  {bottomTabs.length === 0 ? (
                    <div className="dshfp-tab dshfp-tab-empty-pill">bottom</div>
                  ) : bottomTabs.map((tt) => (
                    <div
                      key={tt.id}
                      className={"dshfp-tab" + (tt.id === bottomActiveId ? " on" : "")}
                      onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); closeBottomTab(tt.id); } }}
                      onClick={() => setBottomActiveId(tt.id)}
                      title={tt.path ?? ""}
                    >
                      <span className="dshfp-tab-nm">{tt.title}</span>
                      <button type="button" className="dshfp-tab-x" onClick={(e) => { e.stopPropagation(); closeBottomTab(tt.id); }} title={t?.("dock.close") ?? "Close"} aria-label={t?.("dock.close") ?? "Close"}>✕</button>
                    </div>
                  ))}
                </div>
                {(() => {
                  const ba = bottomTabs.find((tt) => tt.id === bottomActiveId) || null;
                  if (!ba) return <div className="dshfp-tab-empty">Split pane — focus it, then open a file from the tree / a produced-file chip to view two files at once.</div>;
                  if (isImagePath(ba.path)) return <img className="dshfp-img" src={rawSrc(ba.path, base)} alt={ba.path ?? ""} title={ba.path ?? ""} />;
                  const bs = dockSrc(ba.path, { session: ba.session, workspace: base });
                  return <iframe key={"b:" + ba.path + ":" + stamp} src={bs} title={t?.("dock.title") ?? "File pane"} />;
                })()}
              </div>
            </>
          ) : (
            <>
              <div className="dshfp-tabs" role="tablist" aria-label={t?.("dock.openTab") ?? "Open tabs"}>
                {tabs.map((tt) => (
                  <div
                    key={tt.id}
                    className={"dshfp-tab" + (tt.path === path && tt.session === effSession && !activePluginId ? " on" : "")}
                    onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(tt.id); } }}
                    onClick={() => openFile(tt.path)}
                    title={tt.path ?? ""}
                  >
                    <span className="dshfp-tab-nm">{tt.title}</span>
                    <button type="button" className="dshfp-tab-x" onClick={(e) => { e.stopPropagation(); closeTab(tt.id); }} title={t?.("dock.close") ?? "Close"} aria-label={t?.("dock.close") ?? "Close"}>✕</button>
                  </div>
                ))}
                {pluginTabs.map((pt) => (
                  <div
                    key={"plugin:" + pt.id}
                    className={"dshfp-tab" + (activePluginId === pt.id ? " on" : "")}
                    onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); filePane?.closeTab?.(pt.id); } }}
                    onClick={() => { setActivePluginId(pt.id); setShowTree(false); }}
                    title={pt.title ?? pt.id}
                  >
                    <span className="dshfp-tab-nm">{pt.title ?? pt.id}</span>
                    {pt.closable !== false ? (
                      <button type="button" className="dshfp-tab-x" onClick={(e) => { e.stopPropagation(); filePane?.closeTab?.(pt.id); }} title={t?.("dock.close") ?? "Close"} aria-label={t?.("dock.close") ?? "Close"}>✕</button>
                    ) : null}
                  </div>
                ))}
              </div>
              {activePluginId ? (() => {
                const pt = pluginTabs.find((x) => x.id === activePluginId);
                if (!pt) return null;
                const C = pt.component;
                return C ? <C sessionId={effSession} /> : <div className="dshfp-tab-empty">{t?.("dock.noSession") ?? "No content"}</div>;
              })() : (
                <iframe key={path + ":" + diff + ":" + stamp} src={src} title={t?.("dock.title") ?? "File pane"} />
              )}
            </>
          )}
        </div>
      </div>
      {gitErr ? <div className="dshfp-git-err">{gitErr}</div> : null}
      <div className="dshfp-status">
        <button type="button" className="dshfp-branch" onClick={() => setBranchOpen((o) => !o)} title={t?.("dock.branch") ?? "Git branch"}>
          <span className="dshfp-branch-ic">⑂</span>
          <span className="dshfp-branch-name">{git.current ?? (git.git ? "(detached)" : "no git")}</span>
          {git.git ? <span className="dshfp-branch-meta">⌄</span> : null}
        </button>
        {branchOpen ? (
          <div className="dshfp-branch-menu">
            {git.branches.length === 0
              ? <div className="dshfp-branch-item">( no branches )</div>
              : git.branches.map((b) => (
                  <button key={b} type="button" className={"dshfp-branch-item" + (b === git.current ? " on" : "")} onClick={() => doCheckout(b)}>{b}</button>
                ))}
            <button type="button" className="dshfp-branch-item check" onClick={() => setBranchOpen(false)}>close</button>
          </div>
        ) : null}
        <span className="dshfp-status-sp" />
        <span className="dshfp-status-changes">{git.git && changed.length > 0 ? changed.length + " changed" : ""}</span>
      </div>
    </div>
  );
}

/** The details-column entry (a closure over injected services). */
function createDockEntry(services) {
  return (props) => (
    <DockRoot
      t={services.t}
      useSessions={props.useSessions}
      useWorkspaces={props.useWorkspaces}
      layout={services.layout}
      getSession={services.getSession}
      getCwd={services.getCwd}
      themeController={services.themeController}
      defaultTheme={services.defaultTheme}
      filePane={services.filePane}
    />
  );
}

/** Is this path a plain-text/extensible file the diff route can render? */
function isTextPath(p) {
  return /\.(txt|md|markdown|json|ya?ml|csv|tsv|toml|ini|env|gitignore|js|mjs|cjs|tsx?|jsx|py|go|rs|java|c|h|cpp|rb|php|sh|bash|zsh|sql|html?|xml|css|log)$/i.test(p ?? "");
}

/** Build the dock iframe src from the current location (pure, testable). */
function dockSrc(path, { diff = false, session, workspace, gitview, sha, blame = false } = {}) {
  const ws = workspace ? "&workspace=" + encodeURIComponent(workspace) : "";
  if (gitview === "commit" && path) {
    return "/browser/?path=" + encodeURIComponent(path) + "&gitview=commit&sha=" + encodeURIComponent(sha ?? "") + ws + "&embed=1";
  }
  let q = "/browser/?path=" + encodeURIComponent(path ?? "") + ws + "&embed=1";
  if (diff && isTextPath(path)) {
    q = "/browser/?path=" + encodeURIComponent(path) + "&diff=1" + (session ? "&session=" + encodeURIComponent(session) : "") + ws + "&embed=1";
  }
  if (blame && isTextPath(path)) q += "&blame=1";
  return q;
}

/** The remote produced-files row: chips that open the pane viewer. */
function ProducedPaneRow({ matched: paths, t, resolvePath, getSession }) {
  if (!paths || paths.length === 0) return null;
  return (
    <div data-dsh-file-pane-produced="1" className="dshfp-row">
      <span className="dshfp-label">{t?.("produced.label") ?? "Open in pane"}</span>
      <div className="dshfp-chips">
        {paths.map((p) => (
          <button
            type="button"
            key={p}
            className="dshfp-chip"
            title={p}
            onClick={() => openInPane(p, resolvePath, getSession)}
          >
            {basename(p)}
          </button>
        ))}
      </div>
      <style>{`
        .dshfp-row{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;font-size:13px}
        .dshfp-label{color:var(--dsw-alias-label-tertiary,#9aa3b5);white-space:nowrap}
        .dshfp-chips{display:flex;gap:6px;flex-wrap:wrap}
        .dshfp-chip{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;color:var(--dsw-alias-label-secondary,#c7ccd9);
          background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid transparent;border-radius:6px;
          padding:2px 8px;cursor:pointer;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dshfp-chip:hover{color:var(--dsw-alias-label-primary,#e6e9f0);text-decoration:underline;border-color:var(--dsw-alias-border-l3,rgba(255,255,255,.15))}
      `}</style>
    </div>
  );
}

/**
 * Client plugin body: register the dictionary, the turn-tail chain entry at
 * priority -1 (before the built-in row), and the in-app dock occupying the
 * frame's right `details` column (priority -1 shadows ui-conversation's
 * DetailsPanel — the sanctioned way to take over a single seat).
 */
function apply(ctx) {
  // All seats are guaranteed by the `inject` declaration above.
  const slots = ctx.get("slots");
  const connection = ctx.get("connection");
  const sessions = ctx.get("sessions");
  const layout = ctx.get("layout");
  if (layout === undefined) {
    throw new Error("dsh-file-pane: ctx.layout missing — add 'layout' to the bundle-exported inject list in client/index.tsx");
  }
  // Theme runtime (ThemeRuntime from dsh-client-ui-theme). Required like layout —
  // the theme picker rides it; a missing service fails boot loudly.
  const theme = ctx.get("theme");
  if (theme === undefined) {
    throw new Error("dsh-file-pane: ctx.theme missing — add 'theme' to the bundle-exported inject list in client/index.tsx and @deepseek-ai/dsh-client-ui-theme to dsh.client.inject in package.json");
  }
  // Connection classification is stable per page loads (URL hostname), so read
  // it once and close over the same value for both selector and inject.
  const isLoopback = connection.isLoopback === true;
  // Resolve deliverable (cwd-relative) → absolute-under-root for the pane:
  // the currently open session's cwd is the workspace base the produced paths
  // are relative to (mirrors the built-in resolveWorkspacePath). Shared by the
  // produced chips and the dock so both carry the current session (for diff).
  const getSession = () => {
    try { return sessions?.list?.getSnapshot?.().current; } catch { return undefined; }
  };
  // The currently open session's working directory — the workspace being worked
  // on. Used to root the dock file tree (and produced-path resolution) at the
  // active workspace instead of the host root ($HOME).
  const getCwd = () => {
    try {
      const snapshot = sessions?.list?.getSnapshot?.();
      const current = snapshot?.current;
      // DSH's sessions.list snapshot is `{ ids, byId, current, ... }` where
      // `byId[sessionId]` carries `{ id, cwd, title, ... }` — there is NO
      // `entries` array. Reading `.entries.find(...)` threw and the try/catch
      // swallowed it, so `base` fell back to undefined → the dock rooted at the
      // server's $HOME instead of the active workspace. Read through byId.
      const record = current != null ? snapshot?.byId?.[current] : undefined;
      return record?.cwd;
    } catch { return undefined; }
  };
  const resolvePath = (rel) => resolvePanePath(getCwd(), rel);
  ctx.effect(() => ctx.locale.register(NS, {
    en: { "produced.label": "Open in pane", "dock.title": "Files", "dock.close": "Close pane", "dock.openTab": "Open in new tab", "dock.home": "Files root", "dock.up": "Up one level", "dock.reload": "Reload", "dock.diff": "Version diff", "dock.tree": "File tree", "dock.files": "Files", "dock.git": "Git / Changes", "dock.changes": "Changes", "dock.changesHead": "Changes", "dock.branch": "Git branch", "dock.revealTree": "Show file tree", "dock.collapseTree": "Collapse file tree", "dock.noSession": "No session available for diff — open the file from a produced-file chip in chat first.", "dock.theme": "Theme", "dock.themeDefault": "DSH default", "dock.search": "Search", "dock.history": "History", "dock.commit": "Commit", "dock.commitPlaceholder": "Commit message…", "dock.blame": "Blame" },
    zh: { "produced.label": "在面板中打开", "dock.title": "文件", "dock.close": "关闭面板", "dock.openTab": "在新标签页打开", "dock.home": "文件根目录", "dock.up": "上一级", "dock.reload": "刷新", "dock.diff": "版本对比", "dock.tree": "文件树", "dock.files": "文件", "dock.git": "Git / 更改", "dock.changes": "更改", "dock.changesHead": "更改", "dock.branch": "Git 分支", "dock.revealTree": "显示文件树", "dock.collapseTree": "折叠文件树", "dock.noSession": "当前无会话可用于对比 —— 请先在聊天中通过产物文件芯片打开该文件", "dock.theme": "主题", "dock.themeDefault": "默认", "dock.search": "搜索", "dock.history": "历史", "dock.commit": "提交", "dock.commitPlaceholder": "提交信息…", "dock.blame": "追溯" }
  }), "dsh-file-pane: dictionaries");
  // Passive diff spill: agent edit before/after -> host RAM (per open session).
  ctx.conversationEvents.register(makeDiffSpillDefinition(getSession));
  slots.inject("conversation.chat.turnTail", () =>
    slots.register(
      {
        name: "conversation.chat.turnTail",
        priority: -1,
        locale: NS,
        select: selectProducedPane(isLoopback),
        inject: () => ({ isLoopback, resolvePath, getSession })
      },
      ProducedPaneRow
    )
  );
  // In-app dock: owns the frame's right details column (in-flow — it shares the
  // space with the conversation, which resizes around it, matching DSH's native
  // look). priority -1 shadows the built-in DetailsPanel (tool details); this
  // accepted trade-off keeps the pane in the same column treatment as DSH.
  const themeController = createThemeController(theme, {
    load: () => { try { return globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? null; } catch { return null; } },
    emitter: ctx
  });
  // Config default (cordis.patch.yml themePreset) is host-side only — the client
  // bundle does NOT inject `config`, so reading ctx.config would throw "cannot
  // get property config without inject". Seed from localStorage (persisted wins);
  // empty → resolveInitialPreset returns dsh-default (no override).
  const defaultTheme = resolveInitialPreset(undefined, (() => { try { return globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? null; } catch { return null; } })());
  // Service-first extension point (ported from DSH-better-sidebar's ctx.betterSidebar):
  // other plugins register read-only tabs / file viewers that appear in our workbench.
  const filePane = createFilePaneService();
  ctx.provide("filePane", filePane);
  // Dogfood: register our built-in file viewer so other plugins can discover the
  // file pane as a viewer extension point (read-only — component is null because
  // the dock renders files itself via the secure host /browser route).
  ctx.effect(
    () => filePane.registerFileViewer({ id: "dsh-file-pane:file", extensions: ["*"], component: null }),
    "dsh-file-pane: register file viewer",
  );
  const DockEntry = createDockEntry({ t: ctx.locale.bind(NS), layout, getSession, getCwd, themeController, defaultTheme, filePane });
  slots.inject("details", () =>
    slots.register({ name: "details", priority: -1, locale: NS }, DockEntry)
  );
  // Footer toggle restores the dock from the left sidebar when collapsed
  // (declared by ui-sidebar; rides the declaration lifetime like the dock).
  const FooterToggle = () => (
    <button
      type="button"
      data-dsh-file-pane-toggle="1"
      title="Toggle file pane (Ctrl/Cmd+Shift+B)"
      aria-label="Toggle file pane"
      onClick={() => {
        const evt = new CustomEvent(DOCK_OPEN_EVENT, { detail: { path: undefined } });
        window.dispatchEvent(evt); // opens + loads root
      }}
      style={{
        background: "none", border: "0", color: "inherit", cursor: "pointer",
        fontSize: "13px", padding: "4px", borderRadius: "6px", display: "inline-flex"
      }}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 2.5h5l3 3V13.5H4z"/><path d="M9 2.5V6h3"/></svg>
    </button>
  );
  slots.inject("sidebar.footer.action", () =>
    slots.register({ name: "sidebar.footer.action", id: "dsh-file-pane-toggle", order: 10 }, FooterToggle)
  );
}

export { LOADER_ID, apply, producedForClosing, selectProducedPane, narrowDiffs, resolvePanePath, isDockMounted, upPath, dockSrc, breadcrumbParts, stripBase };
