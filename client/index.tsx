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

const LOADER_ID = "dsh-file-pane";
export const name = LOADER_ID;
const NS = "dsh-file-pane";

/**
 * Services this client plugin needs BEFORE `apply` runs. The cordis fiber
 * resolves this list against the root context and only activates the plugin
 * when every service is provided — without it the bundle can activate before
 * `slots`/`locale`/`connection` exist and `apply` throws (boot failure screen
 * "Failed to load plugins: dsh-file-pane").
 */
export const inject = ["slots", "locale", "connection", "conversationEvents", "sessions"];

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

/** Click a produced-file chip → open the dsh-file-pane viewer for it. */
function openInPane(rel, resolvePath) {
  // Same tab preserves the session; a right-click / cmd-click still gets raw nav.
  window.location.assign("/browser/?path=" + encodeURIComponent(resolvePath(rel)));
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
 * Client plugin body: register the dictionary and the turn-tail chain entry
 * at priority -1 (before the built-in row) so remote viewers get the pane
 * navigation instead of a dead Host-open.
 */
function apply(ctx) {
  // Both seats are guaranteed by the `inject` declaration above.
  const slots = ctx.get("slots");
  const connection = ctx.get("connection");
  const sessions = ctx.get("sessions");
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
    en: { "produced.label": "Open in pane" },
    zh: { "produced.label": "在面板中打开" }
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
}

export { LOADER_ID, apply, producedForClosing, selectProducedPane, narrowDiffs, resolvePanePath };
