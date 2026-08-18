/**
 * dsh-file-pane — client-plugin (browser half).
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

const LOADER_ID = "dsh-file-pane";
export const name = LOADER_ID;
const NS = "dsh-file-pane";

/** Window event the produced-file chips dispatch to open a file in the dock. */
const DOCK_OPEN_EVENT = "dsh-file-pane:open";
/** Persisted dock open/closed preference key. */
const DOCK_STORAGE_KEY = "dsh.filePane.dock";
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
export const inject = ["slots", "locale", "connection", "conversationEvents", "sessions", "layout"];

/** Trailing segment of a slash-or-backslash path. */
function basename(p) {
  const at = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return at === -1 ? p : p.slice(at + 1);
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
 */
function openInPane(rel, resolvePath) {
  const path = resolvePath(rel);
  if (dockMounted) {
    window.dispatchEvent(new CustomEvent(DOCK_OPEN_EVENT, { detail: { path } }));
    return;
  }
  // Same tab preserves the session; a right-click / cmd-click still gets raw nav.
  window.location.assign("/browser/?path=" + encodeURIComponent(path));
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
 * DockRoot: the frame's right `details` column occupant. The grid reserves
 * space beside the conversation (no overlay while in-flow); when the column is
 * closed for any reason (blank session, narrow viewport) the dock renders
 * absolute at the right edge instead of vanishing (floating fallback), like
 * dsh-better-sidebar-lite.
 */
function DockRoot({ t, useSessions: _useSessions, useWorkspaces: _useWorkspaces, layout }) {
  const rootRef = useRef(null);
  const [path, setPath] = useState(undefined); // undefined → root listing
  const [open, setOpen] = useState(readDockOpen);
  const [floating, setFloating] = useState(false);

  // Track whether the details column has real width (AppFrame gates it on a
  // current non-blank session + viewport). When closed while open → float.
  useEffect(() => {
    const el = rootRef.current?.parentElement?.parentElement;
    if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => { setFloating(el.getBoundingClientRect().width === 0); };
    read();
    const obs = new ResizeObserver(read);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Open/close via the layout store; persist preference. On mount, open the
  // column if we default to open (matches the source plugin).
  useEffect(() => {
    dockMounted = true;
    if (open) layout?.openDetails?.();
    const onOpen = (e) => { setPath(e.detail?.path); setOpen(true); persistDockOpen(true); layout?.openDetails?.(); };
    window.addEventListener(DOCK_OPEN_EVENT, onOpen);
    return () => { dockMounted = false; window.removeEventListener(DOCK_OPEN_EVENT, onOpen); };
  }, [layout]);

  const toggle = useCallback((next) => {
    setOpen(next); persistDockOpen(next);
    if (next) layout?.openDetails?.(); else layout?.closeDetails?.();
  }, [layout]);

  // Ctrl/Cmd+Shift+B toggles the dock.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyB") {
        e.preventDefault();
        setOpen((o) => { const next = !o; persistDockOpen(next); if (next) layout?.openDetails?.(); else layout?.closeDetails?.(); return next; });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout]);

  if (!open) return null;

  const src = "/browser/?path=" + (path === undefined ? "" : encodeURIComponent(path)) + "&embed=1";
  const name = path === undefined ? "files root" : basename(path);
  const nav = (next) => { setPath(next); };
  // A refresh counter forces the iframe to reload the same path.
  const [stamp, setStamp] = useState(0);
  return (
    <div
      ref={rootRef}
      data-dsh-file-pane-dock="1"
      data-floating={floating || undefined}
      role="region"
      aria-label={t?.("dock.title") ?? "File pane"}
      className="dshfp-dock"
    >
      <style>{`
        .dshfp-dock{display:flex;flex-direction:column;height:100%;min-width:0;background:var(--dsw-alias-bg-base,#0f1117);color:var(--dsw-alias-label-primary,#eef1f8);font:13px/1.4 ui-monospace,Menlo,Consolas,monospace}
        .dshfp-dock[data-floating]{position:absolute;top:16px;right:16px;bottom:16px;width:360px;z-index:60;border:1px solid var(--dsw-alias-border-l3,rgba(255,255,255,.15));border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.45);overflow:hidden;background:var(--dsw-alias-bg-base,#0f1117)}
        .dshfp-dock-head{display:flex;align-items:center;gap:4px;padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));flex:none;min-height:34px}
        .dshfp-dock-head .t{font-weight:600;color:var(--dsw-alias-label-primary,#eef1f8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1;padding:0 4px}
        .dshfp-dock-head button{background:none;border:0;color:var(--dsw-alias-label-secondary,#c7ccd9);cursor:pointer;padding:3px 6px;border-radius:5px;font:inherit;line-height:1;display:inline-flex;align-items:center}
        .dshfp-dock-head button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-dock-head button:disabled{opacity:.35;cursor:default;background:none}
        .dshfp-dock iframe{flex:1;width:100%;border:0;min-height:0;background:#0f1117}
      `}</style>
      <div className="dshfp-dock-head">
        <button type="button" title={t?.("dock.home") ?? "Files root"} onClick={() => nav(undefined)}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 7 8 2.5 13.5 7"/><path d="M4 6.5V13h8V6.5"/></svg>
        </button>
        <button type="button" title={t?.("dock.up") ?? "Up one level"} disabled={!path} onClick={() => nav(upPath(path))}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10.5 8 5.5l5 5"/></svg>
        </button>
        <button type="button" title={t?.("dock.reload") ?? "Reload"} onClick={() => setStamp((s) => s + 1)}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 3.5V7h-3.5"/><path d="M3 12.5V9h3.5"/><path d="M13 7a5 5 0 0 0-8.5-3.5L3 5M13 9l-1.5 1.5A5 5 0 0 1 3 7"/></svg>
        </button>
        <span className="t">{t?.("dock.title") ?? "Files"}{path !== undefined ? ` · ${name}` : ""}</span>
        <button type="button" title={t?.("dock.openTab") ?? "Open in new tab"} onClick={() => window.open(src, "_blank", "noopener")}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.5 9.5 13 3"/><path d="M8.5 3H13v4.5"/><path d="M13 9v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H7"/></svg>
        </button>
        <button type="button" title={t?.("dock.close") ?? "Close pane"} onClick={() => toggle(false)}>✕</button>
      </div>
      <iframe key={path + ":" + stamp} src={src} title={t?.("dock.title") ?? "File pane"} />
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
    />
  );
}

/** The remote produced-files row: chips that open the pane viewer. */
function ProducedPaneRow({ matched: paths, t, resolvePath }) {
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
            onClick={() => openInPane(p, resolvePath)}
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
  // Connection classification is stable per page loads (URL hostname), so read
  // it once and close over the same value for both selector and inject.
  const isLoopback = connection.isLoopback === true;
  // Resolve deliverable (cwd-relative) → absolute-under-root for the pane:
  // the currently open session's cwd is the workspace base the produced paths
  // are relative to (mirrors the built-in resolveWorkspacePath).
  const resolvePath = (rel) => {
    let cwd;
    try {
      const snapshot = sessions?.list?.getSnapshot?.();
      const current = snapshot?.current;
      const entry = current != null ? snapshot?.entries?.find((e) => e.id === current) : undefined;
      cwd = entry?.cwd;
    } catch { /* keep undefined → fall back to raw relative path */ }
    return resolvePanePath(cwd, rel);
  };
  ctx.effect(() => ctx.locale.register(NS, {
    en: { "produced.label": "Open in pane", "dock.title": "Files", "dock.close": "Close pane", "dock.openTab": "Open in new tab", "dock.home": "Files root", "dock.up": "Up one level", "dock.reload": "Reload" },
    zh: { "produced.label": "在面板中打开", "dock.title": "文件", "dock.close": "关闭面板", "dock.openTab": "在新标签页打开", "dock.home": "文件根目录", "dock.up": "上一级", "dock.reload": "刷新" }
  }), "dsh-file-pane: dictionaries");
  // Passive diff spill: agent edit before/after -> host RAM (per open session).
  ctx.conversationEvents.register(makeDiffSpillDefinition(() =>
    sessions?.list?.getSnapshot?.().current
  ));
  slots.inject("conversation.chat.turnTail", () =>
    slots.register(
      {
        name: "conversation.chat.turnTail",
        priority: -1,
        locale: NS,
        select: selectProducedPane(isLoopback),
        inject: () => ({ isLoopback, resolvePath })
      },
      ProducedPaneRow
    )
  );
  // In-app dock: own the frame's right details column. priority -1 shadows the
  // built-in DetailsPanel (tool details); inject (not bare register) rides the
  // declaration lifetime — re-registers after the declaring slot is restored.
  const DockEntry = createDockEntry({ t: ctx.locale.bind(NS), layout });
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

export { LOADER_ID, apply, producedForClosing, selectProducedPane, narrowDiffs, resolvePanePath, isDockMounted, upPath };
