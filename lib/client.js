window.__ModuleLoader__.load({
	id: "dsh-file-pane",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.tsx
var index_exports = {};
__export(index_exports, {
  LOADER_ID: () => LOADER_ID,
  apply: () => apply,
  breadcrumbParts: () => breadcrumbParts,
  dockSrc: () => dockSrc,
  inject: () => inject,
  isDockMounted: () => isDockMounted,
  name: () => name,
  narrowDiffs: () => narrowDiffs,
  producedForClosing: () => producedForClosing,
  resolvePanePath: () => resolvePanePath,
  selectProducedPane: () => selectProducedPane,
  stripBase: () => stripBase,
  upPath: () => upPath
});
module.exports = __toCommonJS(index_exports);
var React = __toESM(require("react"), 1);
var import_react = require("react");
var LOADER_ID = "dsh-file-pane";
var name = LOADER_ID;
var NS = "dsh-file-pane";
var DOCK_OPEN_EVENT = "dsh-file-pane:open";
var DOCK_STORAGE_KEY = "dsh.filePane.dock";
var dockMounted = false;
function isDockMounted() {
  return dockMounted;
}
var inject = ["slots", "locale", "connection", "conversationEvents", "sessions", "layout"];
function basename(p) {
  const at = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return at === -1 ? p : p.slice(at + 1);
}
function resolvePanePath(cwd, path) {
  if (!path) return path;
  if (path.startsWith("/") || /^[A-Za-z]:[/\\]/.test(path) || path.startsWith("\\\\")) return path;
  if (!cwd) return path;
  return `${cwd.replace(/[/\\]+$/, "")}/${path.replace(/^[/\\]+/, "")}`;
}
function producedForClosing(data, seq = Number.POSITIVE_INFINITY) {
  if (data === void 0) return [];
  const paths = [];
  const seen = /* @__PURE__ */ new Set();
  for (const pro of data.produced ?? []) {
    if (pro.seq > seq || seen.has(pro.path)) continue;
    seen.add(pro.path);
    paths.push(pro.path);
  }
  return paths;
}
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
function spillDiff(session, hunk) {
  if (!session) return;
  const body = { session, path: hunk.path, old: hunk.oldText, new: hunk.newText, ts: Date.now() };
  fetch("/browser/api/spill", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).catch(() => {
  });
}
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
      const view = match.view?.view ?? context.state.view;
      const hunks = narrowDiffs(view?.diffs);
      if (hunks.length === 0) return context.state;
      const current = getSession();
      for (const hunk of hunks) spillDiff(current, hunk);
      return context.state;
    }
  };
}
function selectProducedPane(isLoopback) {
  return function(owner) {
    if (isLoopback) return null;
    const paths = producedForClosing(owner.turn.data.get("deliverables"), owner.seq);
    return paths.length === 0 ? null : paths;
  };
}
function openInPane(rel, resolvePath, getSession) {
  const path = resolvePath(rel);
  const session = typeof getSession === "function" ? getSession() : void 0;
  if (dockMounted) {
    window.dispatchEvent(new CustomEvent(DOCK_OPEN_EVENT, { detail: { path, session } }));
    return;
  }
  const q = "/browser/?path=" + encodeURIComponent(path) + (session ? "&session=" + encodeURIComponent(session) : "");
  window.location.assign(q);
}
function readDockOpen() {
  if (typeof localStorage === "undefined") return true;
  try {
    const raw = localStorage.getItem(DOCK_STORAGE_KEY);
    if (raw === null) return true;
    return JSON.parse(raw).open !== false;
  } catch {
    return true;
  }
}
function persistDockOpen(open) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify({ open }));
  } catch {
  }
}
function upPath(p) {
  if (!p) return void 0;
  const at = p.lastIndexOf("/");
  if (at <= 0) return void 0;
  return p.slice(0, at);
}
function breadcrumbParts(p) {
  if (!p) return [{ label: "workspace", path: void 0 }];
  const out = [];
  const segs = p.split("/");
  let acc = "";
  for (let i = 0; i < segs.length; i++) {
    acc = i === 0 ? segs[i] : acc + "/" + segs[i];
    out.push({ label: segs[i], path: acc });
  }
  return out;
}
function stripBase(p, base) {
  if (!p) return void 0;
  if (!base) return p;
  if (p === base) return void 0;
  if (p.startsWith(base + "/")) return p.slice(base.length + 1);
  return p;
}
var DOCK_STATE_KEY = "dsh.filePane.state";
function readDockState() {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(DOCK_STATE_KEY);
    const v = raw ? JSON.parse(raw) : {};
    return { path: typeof v.path === "string" ? v.path : void 0, session: typeof v.session === "string" ? v.session : void 0 };
  } catch {
    return {};
  }
}
function persistDockState(state) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DOCK_STATE_KEY, JSON.stringify({ path: state.path ?? "", session: state.session ?? "" }));
  } catch {
  }
}
var DOCK_WIDTH_KEY = "dsh.filePane.width";
function readDockWidth() {
  if (typeof localStorage === "undefined") return 380;
  try {
    const raw = localStorage.getItem(DOCK_WIDTH_KEY);
    const n = raw != null ? parseInt(raw, 10) : 380;
    if (!Number.isFinite(n) || n <= 0) return 380;
    return Math.min(760, Math.max(300, n));
  } catch {
    return 380;
  }
}
function persistDockWidth(w) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DOCK_WIDTH_KEY, String(w));
  } catch {
  }
}
function clampDockWidth(px, viewport) {
  if (!Number.isFinite(px)) return 380;
  return Math.max(300, Math.min(Math.max(300, Math.round(viewport * 0.5)), Math.round(px)));
}
async function fetchListing(path) {
  try {
    const res = await fetch("/browser/?path=" + encodeURIComponent(path ?? "") + "&json=1");
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.entries) ? data.entries : null;
  } catch {
    return null;
  }
}
function FileTree({ path, onOpen, activePath, depth = 0 }) {
  const [rows, setRows] = (0, import_react.useState)(null);
  const [open, setOpen] = (0, import_react.useState)(depth === 0);
  const [err, setErr] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    if (!open) return;
    let cancelled = false;
    setErr(false);
    setRows(null);
    fetchListing(path).then((entries) => {
      if (cancelled) return;
      if (entries === null) {
        setErr(true);
        setRows([]);
        return;
      }
      const sorted = [...entries].sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name));
      setRows(sorted);
    }).catch(() => {
      if (!cancelled) {
        setErr(true);
        setRows([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, path]);
  const toggle = (e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  };
  return /* @__PURE__ */ React.createElement("ul", { className: "dshfp-tree-l", style: { paddingLeft: depth * 12 } }, /* @__PURE__ */ React.createElement("li", { className: "dshfp-tree-row" }, /* @__PURE__ */ React.createElement("button", { className: "dshfp-tree-node", type: "button", onClick: toggle, "data-dir": "1" }, /* @__PURE__ */ React.createElement("span", { className: "chev" }, open ? "\u2304" : "\u203A"), /* @__PURE__ */ React.createElement("span", { className: "nm" }, depth === 0 ? "workspace" : basename(path))), open ? /* @__PURE__ */ React.createElement("ul", { className: "dshfp-tree-c" }, err ? /* @__PURE__ */ React.createElement("li", { className: "dshfp-tree-empty" }, "( failed to load )") : null, rows === null && !err ? /* @__PURE__ */ React.createElement("li", { className: "dshfp-tree-empty" }, "( loading\u2026 )") : null, (rows ?? []).map((e) => {
    const childPath = path ? path + "/" + e.name : e.name;
    if (e.dir) return /* @__PURE__ */ React.createElement(FileTree, { key: childPath, path: childPath, onOpen, activePath, depth: depth + 1 });
    return /* @__PURE__ */ React.createElement("li", { key: childPath, className: "dshfp-tree-row" }, /* @__PURE__ */ React.createElement("button", { className: "dshfp-tree-node", type: "button", "data-file": "1", "data-active": childPath === activePath || void 0, onClick: () => onOpen(childPath) }, /* @__PURE__ */ React.createElement("span", { className: "chev" }, "\xB7"), /* @__PURE__ */ React.createElement("span", { className: "nm" }, e.name)));
  }), (rows ?? []).length === 0 && !err && rows !== null ? /* @__PURE__ */ React.createElement("li", { className: "dshfp-tree-empty" }, "( empty )") : null) : null));
}
function Breadcrumb({ path, onNavigate }) {
  const parts = breadcrumbParts(path);
  return /* @__PURE__ */ React.createElement("span", { className: "dshfp-crumb", title: path ?? "workspace" }, parts.map((part, i) => {
    const last = i === parts.length - 1;
    return /* @__PURE__ */ React.createElement("span", { key: part.path ?? "root", className: "dshfp-crumb-part" }, i > 0 ? /* @__PURE__ */ React.createElement("span", { className: "dshfp-crumb-sep" }, "/") : null, last ? /* @__PURE__ */ React.createElement("span", { className: "dshfp-crumb-cur" }, part.label) : /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-crumb-link", onClick: () => onNavigate(part.path) }, part.label));
  }));
}
function DockRoot({ t, useSessions: _useSessions, useWorkspaces: _useWorkspaces, layout, getSession, getCwd }) {
  const rootRef = (0, import_react.useRef)(null);
  const [path, setPath] = (0, import_react.useState)(void 0);
  const [session, setSession] = (0, import_react.useState)(void 0);
  const [diff, setDiff] = (0, import_react.useState)(false);
  const [open, setOpen] = (0, import_react.useState)(readDockOpen);
  const [showTree, setShowTree] = (0, import_react.useState)(true);
  const [width, setWidth] = (0, import_react.useState)(readDockWidth);
  const [stamp, setStamp] = (0, import_react.useState)(0);
  const seeded = (0, import_react.useRef)(false);
  const resizeRef = (0, import_react.useRef)(null);
  const onResizeStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev) => {
      const viewport = window.innerWidth;
      const next = clampDockWidth(startW + (startX - ev.clientX), viewport);
      setWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      resizeRef.current = null;
      persistDockWidth(width);
      setWidth((w) => {
        persistDockWidth(w);
        return w;
      });
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    resizeRef.current = { onUp };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  (0, import_react.useEffect)(() => {
    dockMounted = true;
    const initial = readDockState();
    if (initial.path !== void 0 && !seeded.current) {
      seeded.current = true;
      setPath(initial.path);
      setSession(initial.session);
      setDiff(false);
    }
    const onOpen = (e) => {
      const p = e.detail?.path;
      const s = e.detail?.session;
      seeded.current = true;
      setPath(p);
      setSession(s);
      setDiff(false);
      persistDockState({ path: p, session: s });
      setOpen(true);
      persistDockOpen(true);
    };
    window.addEventListener(DOCK_OPEN_EVENT, onOpen);
    return () => {
      dockMounted = false;
      window.removeEventListener(DOCK_OPEN_EVENT, onOpen);
    };
  }, []);
  const toggle = (0, import_react.useCallback)((next) => {
    setOpen(next);
    persistDockOpen(next);
  }, []);
  (0, import_react.useEffect)(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyB") {
        e.preventDefault();
        setOpen((o) => {
          const next = !o;
          persistDockOpen(next);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!open) return null;
  const effSession = session ?? (typeof getSession === "function" ? getSession() : void 0);
  const base = typeof getCwd === "function" ? getCwd() : void 0;
  const viewPath = path ?? base;
  const src = dockSrc(viewPath, { diff, session: effSession });
  const needSessionNote = diff && isTextPath(viewPath) && effSession === void 0;
  const nav = (next) => {
    setPath(next);
  };
  const relC = stripBase(viewPath, base);
  const upRel = upPath(relC);
  const navClose = (rel) => nav(base && rel ? base + "/" + rel.replace(/^\/+/, "") : base ?? void 0);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: rootRef,
      "data-dsh-file-pane-dock": "1",
      role: "region",
      "aria-label": t?.("dock.title") ?? "File pane",
      className: "dshfp-dock",
      style: { width }
    },
    /* @__PURE__ */ React.createElement("style", null, `
        .dshfp-dock{display:flex;flex-direction:column;min-width:0;position:fixed;top:0;right:0;bottom:0;z-index:60;overflow:hidden;background:var(--dsw-alias-bg-base,#0f1117);color:var(--dsw-alias-label-primary,#eef1f8);font:13px/1.4 ui-monospace,Menlo,Consolas,monospace;border-left:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));box-shadow:-8px 0 30px rgba(0,0,0,.28)}
        .dshfp-dock-resize{position:absolute;left:0;top:0;bottom:0;width:6px;cursor:col-resize;z-index:5;touch-action:none}
        .dshfp-dock-resize:hover{background:var(--dsw-alias-state-business-primary,rgba(91,150,255,.35))}
        .dshfp-dock-head{display:flex;align-items:center;gap:4px;padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));flex:none;min-height:34px;flex-wrap:wrap}
        .dshfp-dock-head .t{font-weight:600;color:var(--dsw-alias-label-primary,#eef1f8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1;padding:0 4px}
        .dshfp-dock-head button{background:none;border:0;color:var(--dsw-alias-label-secondary,#c7ccd9);cursor:pointer;padding:3px 6px;border-radius:5px;font:inherit;line-height:1;display:inline-flex;align-items:center}
        .dshfp-dock-head button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eef1f8)}
        .dshfp-dock-head button:disabled{opacity:.35;cursor:default;background:none}
        .dshfp-dock-head button[data-on]{color:var(--dsw-alias-state-business-primary,#5b96ff);outline:1px solid currentColor;outline-offset:-1px}
        .dshfp-dock-note{background:rgba(255,191,0,.08);color:var(--dsw-alias-state-warn-primary,#f0b386);padding:4px 8px;font-size:11px;line-height:1.4;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));flex:none}
        .dshfp-dock-body{display:flex;flex:1;min-height:0}
        .dshfp-dock-tree{width:180px;min-width:180px;border-right:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));overflow:auto;padding:4px 0;flex:none}
        .dshfp-dock iframe{flex:1;width:100%;border:0;min-height:0;background:#0f1117}
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
      `),
    /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-resize", title: "Drag to resize", onMouseDown: onResizeStart }),
    /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-head" }, /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.home") ?? "Files root", onClick: () => {
      nav(base);
      setDiff(false);
    } }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M2.5 7 8 2.5 13.5 7" }), /* @__PURE__ */ React.createElement("path", { d: "M4 6.5V13h8V6.5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.up") ?? "Up one level", disabled: !path || !upRel, onClick: () => {
      nav(navClose(upRel));
      setDiff(false);
    } }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M3 10.5 8 5.5l5 5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.reload") ?? "Reload", onClick: () => setStamp((s) => s + 1) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M13 3.5V7h-3.5" }), /* @__PURE__ */ React.createElement("path", { d: "M3 12.5V9h3.5" }), /* @__PURE__ */ React.createElement("path", { d: "M13 7a5 5 0 0 0-8.5-3.5L3 5M13 9l-1.5 1.5A5 5 0 0 1 3 7" }))), /* @__PURE__ */ React.createElement(Breadcrumb, { path: relC, onNavigate: (rel) => {
      nav(navClose(rel));
      setDiff(false);
    } }), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.tree") ?? "Toggle file tree", "data-on": showTree || void 0, onClick: () => setShowTree((v) => !v) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M3 3.5h4v3H3z" }), /* @__PURE__ */ React.createElement("path", { d: "M9 9.5h4v3H9z" }), /* @__PURE__ */ React.createElement("path", { d: "M5 6.5v3M11 6.5v3M5 6.5h6" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.diff") ?? "Version diff", "data-on": diff && isTextPath(path) || void 0, disabled: !isTextPath(path) || path === void 0, onClick: () => setDiff((v) => !v) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 4h4M4 8h4M4 12h4" }), /* @__PURE__ */ React.createElement("path", { d: "M12 3.5v9" }), /* @__PURE__ */ React.createElement("path", { d: "M10.5 5.5 12 4l1.5 1.5M10.5 10.5 12 12l1.5-1.5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.openTab") ?? "Open in new tab", onClick: () => window.open(src, "_blank", "noopener") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M6.5 9.5 13 3" }), /* @__PURE__ */ React.createElement("path", { d: "M8.5 3H13v4.5" }), /* @__PURE__ */ React.createElement("path", { d: "M13 9v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H7" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.close") ?? "Close pane", onClick: () => toggle(false) }, "\u2715")),
    needSessionNote ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-note" }, t?.("dock.noSession") ?? "No session available for diff \u2014 open the file from a produced-file chip in chat first.") : null,
    /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-body" }, showTree ? /* @__PURE__ */ React.createElement("nav", { className: "dshfp-dock-tree", "aria-label": t?.("dock.tree") ?? "File tree" }, /* @__PURE__ */ React.createElement(FileTree, { path: base, onOpen: (p) => {
      setPath(p);
      setDiff(false);
    }, activePath: viewPath })) : null, /* @__PURE__ */ React.createElement("iframe", { key: path + ":" + diff + ":" + stamp, src, title: t?.("dock.title") ?? "File pane" }))
  );
}
function createDockEntry(services) {
  return (props) => /* @__PURE__ */ React.createElement(
    DockRoot,
    {
      t: services.t,
      useSessions: props.useSessions,
      useWorkspaces: props.useWorkspaces,
      layout: services.layout,
      getSession: services.getSession,
      getCwd: services.getCwd
    }
  );
}
function isTextPath(p) {
  return /\.(txt|md|markdown|json|ya?ml|csv|tsv|toml|ini|env|gitignore|js|mjs|cjs|tsx?|jsx|py|go|rs|java|c|h|cpp|rb|php|sh|bash|zsh|sql|html?|xml|css|log)$/i.test(p ?? "");
}
function dockSrc(path, { diff = false, session } = {}) {
  let q = "/browser/?path=" + encodeURIComponent(path ?? "") + "&embed=1";
  if (diff && isTextPath(path)) {
    q = "/browser/?path=" + encodeURIComponent(path) + "&diff=1" + (session ? "&session=" + encodeURIComponent(session) : "") + "&embed=1";
  }
  return q;
}
function ProducedPaneRow({ matched: paths, t, resolvePath, getSession }) {
  if (!paths || paths.length === 0) return null;
  return /* @__PURE__ */ React.createElement("div", { "data-dsh-file-pane-produced": "1", className: "dshfp-row" }, /* @__PURE__ */ React.createElement("span", { className: "dshfp-label" }, t?.("produced.label") ?? "Open in pane"), /* @__PURE__ */ React.createElement("div", { className: "dshfp-chips" }, paths.map((p) => /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      key: p,
      className: "dshfp-chip",
      title: p,
      onClick: () => openInPane(p, resolvePath, getSession)
    },
    basename(p)
  ))), /* @__PURE__ */ React.createElement("style", null, `
        .dshfp-row{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap;font-size:13px}
        .dshfp-label{color:var(--dsw-alias-label-tertiary,#9aa3b5);white-space:nowrap}
        .dshfp-chips{display:flex;gap:6px;flex-wrap:wrap}
        .dshfp-chip{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;color:var(--dsw-alias-label-secondary,#c7ccd9);
          background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));border:1px solid transparent;border-radius:6px;
          padding:2px 8px;cursor:pointer;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dshfp-chip:hover{color:var(--dsw-alias-label-primary,#e6e9f0);text-decoration:underline;border-color:var(--dsw-alias-border-l3,rgba(255,255,255,.15))}
      `));
}
function apply(ctx) {
  const slots = ctx.get("slots");
  const connection = ctx.get("connection");
  const sessions = ctx.get("sessions");
  const layout = ctx.get("layout");
  if (layout === void 0) {
    throw new Error("dsh-file-pane: ctx.layout missing \u2014 add 'layout' to the bundle-exported inject list in client/index.tsx");
  }
  const isLoopback = connection.isLoopback === true;
  const getSession = () => {
    try {
      return sessions?.list?.getSnapshot?.().current;
    } catch {
      return void 0;
    }
  };
  const getCwd = () => {
    try {
      const snapshot = sessions?.list?.getSnapshot?.();
      const current = snapshot?.current;
      const entry = current != null ? snapshot?.entries?.find((e) => e.id === current) : void 0;
      return entry?.cwd;
    } catch {
      return void 0;
    }
  };
  const resolvePath = (rel) => resolvePanePath(getCwd(), rel);
  ctx.effect(() => ctx.locale.register(NS, {
    en: { "produced.label": "Open in pane", "dock.title": "Files", "dock.close": "Close pane", "dock.openTab": "Open in new tab", "dock.home": "Files root", "dock.up": "Up one level", "dock.reload": "Reload", "dock.diff": "Version diff", "dock.tree": "Toggle file tree", "dock.noSession": "No session available for diff \u2014 open the file from a produced-file chip in chat first." },
    zh: { "produced.label": "\u5728\u9762\u677F\u4E2D\u6253\u5F00", "dock.title": "\u6587\u4EF6", "dock.close": "\u5173\u95ED\u9762\u677F", "dock.openTab": "\u5728\u65B0\u6807\u7B7E\u9875\u6253\u5F00", "dock.home": "\u6587\u4EF6\u6839\u76EE\u5F55", "dock.up": "\u4E0A\u4E00\u7EA7", "dock.reload": "\u5237\u65B0", "dock.diff": "\u7248\u672C\u5BF9\u6BD4", "dock.tree": "\u5207\u6362\u6587\u4EF6\u6811", "dock.noSession": "\u5F53\u524D\u65E0\u4F1A\u8BDD\u53EF\u7528\u4E8E\u5BF9\u6BD4 \u2014\u2014 \u8BF7\u5148\u5728\u804A\u5929\u4E2D\u901A\u8FC7\u4EA7\u7269\u6587\u4EF6\u82AF\u7247\u6253\u5F00\u8BE5\u6587\u4EF6" }
  }), "dsh-file-pane: dictionaries");
  ctx.conversationEvents.register(makeDiffSpillDefinition(getSession));
  slots.inject(
    "conversation.chat.turnTail",
    () => slots.register(
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
  const DockEntry = createDockEntry({ t: ctx.locale.bind(NS), layout, getSession, getCwd });
  slots.inject(
    "shell.overlay",
    () => slots.register({ name: "shell.overlay", id: "dsh-file-pane", priority: -1, locale: NS }, DockEntry)
  );
  const FooterToggle = () => /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-dsh-file-pane-toggle": "1",
      title: "Toggle file pane (Ctrl/Cmd+Shift+B)",
      "aria-label": "Toggle file pane",
      onClick: () => {
        const evt = new CustomEvent(DOCK_OPEN_EVENT, { detail: { path: void 0 } });
        window.dispatchEvent(evt);
      },
      style: {
        background: "none",
        border: "0",
        color: "inherit",
        cursor: "pointer",
        fontSize: "13px",
        padding: "4px",
        borderRadius: "6px",
        display: "inline-flex"
      }
    },
    /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 2.5h5l3 3V13.5H4z" }), /* @__PURE__ */ React.createElement("path", { d: "M9 2.5V6h3" }))
  );
  slots.inject(
    "sidebar.footer.action",
    () => slots.register({ name: "sidebar.footer.action", id: "dsh-file-pane-toggle", order: 10 }, FooterToggle)
  );
}

		return module.exports;
	}
});
