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
  fetchSearch: () => fetchSearch,
  inject: () => inject,
  isDockMounted: () => isDockMounted,
  name: () => name,
  narrowDiffs: () => narrowDiffs,
  producedForClosing: () => producedForClosing,
  readNdjson: () => readNdjson,
  refreshDirty: () => refreshDirty,
  resolvePanePath: () => resolvePanePath,
  selectProducedPane: () => selectProducedPane,
  stripBase: () => stripBase,
  upPath: () => upPath
});
module.exports = __toCommonJS(index_exports);
var React = __toESM(require("react"), 1);
var import_react = require("react");

// client/theme-presets.ts
var DEFAULT_PRESET = "dsh-default";
var PRESETS = {
  "dsh-default": {
    id: "dsh-default",
    label: "DSH default",
    labelZh: "\u9ED8\u8BA4",
    tokens: {}
  },
  "deepseek-blue": {
    id: "deepseek-blue",
    label: "Deepseek Blue",
    labelZh: "\u6DF1\u6D77\u84DD",
    // DSH-native neutrals with the dock's existing #5b96ff-family accent pinned
    // so the dock and the surrounding web UI agree on the blue identity.
    tokens: {
      "--dsw-alias-state-business-primary": { light: "#5b96ff", dark: "#7aa8ff" },
      "--dsw-alias-brand-primary": { light: "#4a7ef0", dark: "#8db4ff" },
      "--dsw-alias-state-business-tertiary": { light: "#d9e6ff", dark: "#2b3a5e" },
      "--dsw-alias-bg-base": { light: "#ffffff", dark: "#0f1117" },
      "--dsw-alias-bg-layer-1": { light: "#f5f6f8", dark: "#1b1b1c" },
      "--dsw-alias-bg-layer-2": { light: "#edf0f4", dark: "#232324" },
      "--dsw-alias-label-primary": { light: "#14161f", dark: "#eef1f8" },
      "--dsw-alias-label-secondary": { light: "#586174", dark: "#c7ccd9" },
      "--dsw-alias-label-tertiary": { light: "#8790a1", dark: "#9aa3b5" },
      "--dsw-alias-border-l2": { light: "rgba(10,14,30,.09)", dark: "rgba(255,255,255,.12)" },
      "--dsw-alias-border-l3": { light: "rgba(10,14,30,.12)", dark: "rgba(255,255,255,.16)" }
    }
  },
  nord: {
    id: "nord",
    label: "Nord",
    labelZh: "\u5317\u6B27\u84DD",
    // Cool slate background, muted fg, cyan/teal accent (classic Nord).
    tokens: {
      "--dsw-alias-state-business-primary": { light: "#2f88a6", dark: "#88c0d0" },
      "--dsw-alias-brand-primary": { light: "#2f88a6", dark: "#88c0d0" },
      "--dsw-alias-state-business-tertiary": { light: "#d6e7ee", dark: "#38485f" },
      "--dsw-alias-bg-base": { light: "#eceff4", dark: "#2e3440" },
      "--dsw-alias-bg-layer-1": { light: "#e5e9f0", dark: "#3b4252" },
      "--dsw-alias-bg-layer-2": { light: "#d8dee9", dark: "#434c5e" },
      "--dsw-alias-label-primary": { light: "#2e3440", dark: "#eceff4" },
      "--dsw-alias-label-secondary": { light: "#4c566a", dark: "#d8dee9" },
      "--dsw-alias-label-tertiary": { light: "#7e8ca0", dark: "#8f9bb0" },
      "--dsw-alias-border-l2": { light: "rgba(46,52,64,.12)", dark: "rgba(216,222,233,.14)" },
      "--dsw-alias-border-l3": { light: "rgba(46,52,64,.15)", dark: "rgba(216,222,233,.18)" }
    }
  },
  "codex-warm": {
    id: "codex-warm",
    label: "Codex Warm",
    labelZh: "\u6696\u7EB8\u8272",
    // Warm brown/tan background, cream fg, amber/orange accent.
    tokens: {
      "--dsw-alias-state-business-primary": { light: "#b45309", dark: "#f59e0b" },
      "--dsw-alias-brand-primary": { light: "#c06a1a", dark: "#f0a03c" },
      "--dsw-alias-state-business-tertiary": { light: "#f3dfc2", dark: "#4a3a2c" },
      "--dsw-alias-bg-base": { light: "#f8f2e7", dark: "#241a16" },
      "--dsw-alias-bg-layer-1": { light: "#f0e7d6", dark: "#32251e" },
      "--dsw-alias-bg-layer-2": { light: "#e6d9c4", dark: "#3e2f25" },
      "--dsw-alias-label-primary": { light: "#2b2118", dark: "#f5e9d8" },
      "--dsw-alias-label-secondary": { light: "#5d4b36", dark: "#ccb9a4" },
      "--dsw-alias-label-tertiary": { light: "#8d765c", dark: "#a08d77" },
      "--dsw-alias-border-l2": { light: "rgba(60,43,26,.12)", dark: "rgba(245,233,216,.12)" },
      "--dsw-alias-border-l3": { light: "rgba(60,43,26,.15)", dark: "rgba(245,233,216,.16)" }
    }
  }
};
function presetIds() {
  return Object.keys(PRESETS);
}

// client/theme-controller.ts
function resolveInitialPreset(cfg, persisted) {
  const ids = presetIds();
  if (typeof persisted === "string" && ids.includes(persisted)) return persisted;
  const fromCfg = cfg != null && typeof cfg === "object" && typeof cfg.themePreset === "string" ? cfg.themePreset : null;
  if (fromCfg && ids.includes(fromCfg)) return fromCfg;
  return DEFAULT_PRESET;
}
function createThemeController(theme, opts = {}) {
  const emitter = opts.emitter;
  let layer = null;
  let activeId = null;
  let offChange = null;
  let disposed = false;
  if (emitter && typeof emitter.on === "function") {
    try {
      offChange = emitter.on("theme/change", () => {
      });
    } catch {
      offChange = null;
    }
  }
  function clear() {
    if (layer) {
      const d = layer;
      layer = null;
      d();
    }
    activeId = null;
  }
  function apply2(id) {
    if (id === DEFAULT_PRESET || !Object.prototype.hasOwnProperty.call(PRESETS, id)) {
      clear();
      return;
    }
    clear();
    activeId = id;
    layer = theme.overrideTokens("dsh-file-pane", PRESETS[id].tokens);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    clear();
    if (offChange) {
      offChange();
      offChange = null;
    }
  }
  return { apply: apply2, clear, dispose, active: () => activeId };
}

// client/search-text.ts
function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function splitHighlight(text, pre, post) {
  const full = String(text ?? "");
  const before = String(pre ?? "");
  const after = String(post ?? "");
  const middle = before.length + after.length <= full.length ? full.slice(before.length, full.length - after.length) : full.slice(before.length);
  return escapeHtml(before) + "<mark>" + escapeHtml(middle) + "</mark>" + escapeHtml(after);
}

// client/index.tsx
var LOADER_ID = "dsh-file-pane";
var name = LOADER_ID;
var NS = "dsh-file-pane";
var DOCK_OPEN_EVENT = "dsh-file-pane:open";
var DOCK_STORAGE_KEY = "dsh.filePane.dock";
var THEME_STORAGE_KEY = "dsh.filePane.theme";
var dockMounted = false;
function isDockMounted() {
  return dockMounted;
}
var inject = ["slots", "locale", "connection", "conversationEvents", "sessions", "layout", "theme"];
function basename(p) {
  const at = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return at === -1 ? p : p.slice(at + 1);
}
function tabKey(sid, p) {
  return "t:" + (sid ?? "") + ":" + (p ?? "");
}
var TAB_STORE_KEY = "dsh.filePane.tabs.v1";
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
  }
}
function createFilePaneService() {
  const tabs = [];
  const viewers = [];
  const listeners = /* @__PURE__ */ new Set();
  const emit = () => {
    for (const l of listeners) {
      try {
        l();
      } catch {
      }
    }
  };
  return {
    version: "0.1.0",
    /** Register a read-only workbench tab. Returns a disposer. */
    registerTab(descriptor) {
      const d = {
        id: String(descriptor.id),
        title: String(descriptor.title ?? descriptor.id),
        component: descriptor.component,
        closable: descriptor.closable !== false
      };
      tabs.push(d);
      emit();
      return () => {
        const i = tabs.indexOf(d);
        if (i >= 0) tabs.splice(i, 1);
        emit();
      };
    },
    /** Register a file viewer for extensions (discovery point; read-only). */
    registerFileViewer(descriptor) {
      const d = {
        id: String(descriptor.id),
        extensions: Array.isArray(descriptor.extensions) ? descriptor.extensions : [],
        component: descriptor.component
      };
      viewers.push(d);
      emit();
      return () => {
        const i = viewers.indexOf(d);
        if (i >= 0) viewers.splice(i, 1);
        emit();
      };
    },
    /** Close a plugin-registered tab by id (used by the tab's × button). */
    closeTab(id) {
      const i = tabs.findIndex((tt) => tt.id === id);
      if (i >= 0) {
        tabs.splice(i, 1);
        emit();
      }
    },
    getTabs: () => tabs.slice(),
    getViewers: () => viewers.slice(),
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    }
  };
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
async function fetchListing(path, workspace) {
  try {
    const res = await fetch("/browser/?path=" + encodeURIComponent(path ?? "") + "&json=1" + (workspace ? "&workspace=" + encodeURIComponent(workspace) : ""));
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.entries) ? data.entries : null;
  } catch {
    return null;
  }
}
async function refreshDirty(batch, { workspace, viewPath, base, fetchListingFn, fetchGitStatusFn, setStamp, onGitStatus }) {
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
  const viewRel = stripBase(viewPath, base);
  let reloadIframe = false;
  if (viewRel) reloadIframe = touch(viewRel);
  if (touch(viewRel || "")) {
    if (setStamp) setStamp((s) => s + 1);
    await fetchList(viewPath ?? base, base);
  }
  if (events.some((e) => e?.kind === "add" || e?.kind === "change" || e?.kind === "unlink")) {
    const d = await fetchGit(workspace);
    if (d && typeof onGitStatus === "function") onGitStatus(d);
  }
  if (reloadIframe && setStamp) setStamp((s) => s + 1);
}
async function fetchGitBranch(workspace) {
  if (!workspace) return null;
  try {
    const res = await fetch("/browser/api/git/branch?workspace=" + encodeURIComponent(workspace));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
async function fetchGitStatus(workspace) {
  if (!workspace) return null;
  try {
    const res = await fetch("/browser/api/git/status?workspace=" + encodeURIComponent(workspace));
    if (!res.ok) return null;
    const d = await res.json();
    return Array.isArray(d?.changes) ? d : null;
  } catch {
    return null;
  }
}
async function checkoutGitBranch(workspace, branch) {
  if (!workspace || !branch) return null;
  try {
    const res = await fetch("/browser/api/git/checkout?workspace=" + encodeURIComponent(workspace) + "&branch=" + encodeURIComponent(branch), { method: "POST" });
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}
async function fetchGitLog(workspace, limit = 100) {
  if (!workspace) return [];
  try {
    const res = await fetch("/browser/api/git/log?workspace=" + encodeURIComponent(workspace) + "&limit=" + limit);
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d?.entries) ? d.entries : [];
  } catch {
    return [];
  }
}
async function commitGit(workspace, message) {
  if (!workspace || !message) return null;
  try {
    const res = await fetch("/browser/api/git/commit?workspace=" + encodeURIComponent(workspace), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message })
    });
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}
function FileTree({ path, onOpen, activePath, depth = 0, workspace }) {
  const [rows, setRows] = (0, import_react.useState)(null);
  const [open, setOpen] = (0, import_react.useState)(depth === 0);
  const [err, setErr] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    if (!open) return;
    let cancelled = false;
    setErr(false);
    setRows(null);
    fetchListing(path, workspace).then((entries) => {
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
  }, [open, path, workspace]);
  const toggle = (e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  };
  return /* @__PURE__ */ React.createElement("ul", { className: "dshfp-tree-l", style: { paddingLeft: depth * 12 } }, /* @__PURE__ */ React.createElement("li", { className: "dshfp-tree-row" }, /* @__PURE__ */ React.createElement("button", { className: "dshfp-tree-node", type: "button", onClick: toggle, "data-dir": "1" }, /* @__PURE__ */ React.createElement("span", { className: "chev" }, open ? "\u2304" : "\u203A"), /* @__PURE__ */ React.createElement("span", { className: "nm" }, path ? basename(path) : "workspace")), open ? /* @__PURE__ */ React.createElement("ul", { className: "dshfp-tree-c" }, err ? /* @__PURE__ */ React.createElement("li", { className: "dshfp-tree-empty" }, "( failed to load )") : null, rows === null && !err ? /* @__PURE__ */ React.createElement("li", { className: "dshfp-tree-empty" }, "( loading\u2026 )") : null, (rows ?? []).map((e) => {
    const childPath = path ? path + "/" + e.name : e.name;
    if (e.dir) return /* @__PURE__ */ React.createElement(FileTree, { key: childPath, path: childPath, onOpen, activePath, depth: depth + 1, workspace });
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
var SEARCH_ROW_CAP = 200;
var SEARCH_DEBOUNCE_MS = 250;
async function readNdjson(body, onRecord) {
  if (!body) return;
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value ?? new Uint8Array(0), { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        try {
          onRecord(JSON.parse(line));
        } catch {
        }
      }
    }
    if (buf.trim()) {
      try {
        onRecord(JSON.parse(buf.trim()));
      } catch {
      }
    }
  } catch {
  }
}
async function fetchSearch(ws, opts) {
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
function SearchSection({ ws, t, onOpen }) {
  const [q, setQ] = (0, import_react.useState)("");
  const [debounced, setDebounced] = (0, import_react.useState)("");
  const [mode, setMode] = (0, import_react.useState)("content");
  const [rows, setRows] = (0, import_react.useState)([]);
  const [truncated, setTruncated] = (0, import_react.useState)(false);
  const [err, setErr] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [count, setCount] = (0, import_react.useState)(0);
  const abortRef = (0, import_react.useRef)(null);
  const seqRef = (0, import_react.useRef)(0);
  (0, import_react.useEffect)(() => {
    const t2 = setTimeout(() => setDebounced(q.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t2);
  }, [q]);
  (0, import_react.useEffect)(() => {
    abortRef.current?.abort();
    if (!debounced) {
      setRows([]);
      setCount(0);
      setTruncated(false);
      setErr(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    const seq = ++seqRef.current;
    setErr(null);
    setLoading(true);
    setRows([]);
    setCount(0);
    setTruncated(false);
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
          if (pending.length >= SEARCH_ROW_CAP) {
            setTruncated(true);
            ac.abort();
            return;
          }
          if (!pending.some((r2) => r2.key === key)) {
            pending.push({ ...rec, key });
            setCount((c) => c + 1);
          }
        } else if (rec.t === "done") {
          setTruncated(!!rec.truncated);
        } else if (rec.t === "error") {
          setErr(rec.message || "search error");
        }
      }
    }).finally(() => {
      if (seq === seqRef.current) {
        setLoading(false);
        setRows(pending.slice(0, SEARCH_ROW_CAP));
      }
    });
    return () => {
      ac.abort();
    };
  }, [debounced, mode, ws]);
  return /* @__PURE__ */ React.createElement("div", { className: "dshfp-search", "data-dsh-file-pane-search": "1" }, /* @__PURE__ */ React.createElement("div", { className: "dshfp-search-bar" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: q,
      placeholder: "Search workspace\u2026",
      "aria-label": "Search workspace",
      onChange: (e) => setQ(e.target.value)
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "dshfp-search-mode" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: mode === "name" ? "on" : "", onClick: () => setMode("name") }, "Name"), /* @__PURE__ */ React.createElement("button", { type: "button", className: mode === "content" ? "on" : "", onClick: () => setMode("content") }, "Content"))), loading ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-search-status" }, "searching\u2026") : null, err ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-search-status dshfp-search-err" }, err) : null, !loading && !err && rows.length === 0 && debounced ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-search-status" }, "no matches") : null, count > 0 ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-search-meta" }, count, " match", count === 1 ? "" : "es", truncated ? ` \xB7 showing first ${SEARCH_ROW_CAP}` : "") : null, /* @__PURE__ */ React.createElement("div", { className: "dshfp-search-results" }, rows.map((r) => /* @__PURE__ */ React.createElement("button", { type: "button", key: r.key, className: "dshfp-sr", onClick: () => onOpen(r) }, /* @__PURE__ */ React.createElement("span", { className: "dshfp-sr-path" }, r.path, r.line && mode === "content" ? /* @__PURE__ */ React.createElement("em", null, ":", r.line) : null), mode === "content" && r.text ? /* @__PURE__ */ React.createElement("span", { className: "dshfp-sr-snippet", dangerouslySetInnerHTML: { __html: splitHighlight(r.text, r.pre ?? "", r.post ?? "") } }) : null))));
}
function ThemePicker({ t, value, onChange }) {
  const ids = presetIds();
  return /* @__PURE__ */ React.createElement(
    "select",
    {
      className: "dshfp-theme-picker",
      value: value ?? "",
      onChange: (e) => onChange(e.target.value),
      title: t?.("dock.theme") ?? "Theme",
      "aria-label": t?.("dock.theme") ?? "Theme"
    },
    ids.map((id) => /* @__PURE__ */ React.createElement("option", { key: id, value: id }, id === "dsh-default" ? t?.("dock.themeDefault") ?? "DSH default" : id)),
    /* @__PURE__ */ React.createElement("style", null, `
        .dshfp-theme-picker{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));color:var(--dsw-alias-label-secondary,#c7ccd9);
          border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));border-radius:5px;font:inherit;font-size:12px;max-width:118px;
          padding:1px 4px;cursor:pointer}
        .dshfp-theme-picker:hover{border-color:var(--dsw-alias-border-l3,rgba(255,255,255,.2));color:var(--dsw-alias-label-primary,#eef1f8)}
      `)
  );
}
function DockRoot({ t, useSessions: _useSessions, useWorkspaces: _useWorkspaces, layout, getSession, getCwd, themeController, defaultTheme, filePane }) {
  const rootRef = (0, import_react.useRef)(null);
  const [path, setPath] = (0, import_react.useState)(void 0);
  const [session, setSession] = (0, import_react.useState)(void 0);
  const [diff, setDiff] = (0, import_react.useState)(false);
  const [open, setOpen] = (0, import_react.useState)(readDockOpen);
  const [showTree, setShowTree] = (0, import_react.useState)(true);
  const [treeHover, setTreeHover] = (0, import_react.useState)(false);
  const [hoverAct, setHoverAct] = (0, import_react.useState)(null);
  const [stamp, setStamp] = (0, import_react.useState)(0);
  const [changeView, setChangeView] = (0, import_react.useState)(false);
  const [searchView, setSearchView] = (0, import_react.useState)(false);
  const [changed, setChanged] = (0, import_react.useState)([]);
  const [git, setGit] = (0, import_react.useState)({ git: false, current: null, branches: [], write: false });
  const [branchOpen, setBranchOpen] = (0, import_react.useState)(false);
  const [themeId, setThemeId] = (0, import_react.useState)(() => {
    try {
      return globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [gitErr, setGitErr] = (0, import_react.useState)(null);
  const [gitView, setGitView] = (0, import_react.useState)("changes");
  const [history, setHistory] = (0, import_react.useState)([]);
  const [commitMsg, setCommitMsg] = (0, import_react.useState)("");
  const [commitBusy, setCommitBusy] = (0, import_react.useState)(false);
  const [blameOn, setBlameOn] = (0, import_react.useState)(false);
  const [commitTarget, setCommitTarget] = (0, import_react.useState)(null);
  const [watching, setWatching] = (0, import_react.useState)(true);
  const [tabs, setTabs] = (0, import_react.useState)([]);
  const [activePluginId, setActivePluginId] = (0, import_react.useState)(null);
  const [pluginTabs, setPluginTabs] = (0, import_react.useState)([]);
  const [bottomTabs, setBottomTabs] = (0, import_react.useState)([]);
  const [bottomActiveId, setBottomActiveId] = (0, import_react.useState)(null);
  const [splitOpen, setSplitOpen] = (0, import_react.useState)(false);
  const [splitPct, setSplitPct] = (0, import_react.useState)(55);
  const [focusedPane, setFocusedPane] = (0, import_react.useState)("top");
  const seeded = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    dockMounted = true;
    const initial = readDockState();
    if (initial.path !== void 0 && !seeded.current) {
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
      setPath(p);
      setSession(s);
      setDiff(false);
      setShowTree(!p);
      persistDockState({ path: p, session: s });
      setOpen(true);
      persistDockOpen(true);
      layout?.openDetails?.();
    };
    window.addEventListener(DOCK_OPEN_EVENT, onOpen);
    const saved = loadTabs();
    if (saved) {
      setTabs(saved.tabs || []);
      const aId = saved.activeId;
      if (aId && (saved.tabs || []).some((tt) => tt.id === aId)) {
        const at = (saved.tabs || []).find((tt) => tt.id === aId);
        if (at && at.path !== void 0) {
          setPath(at.path);
          setSession(at.session);
          setShowTree(false);
        }
      }
    }
    return () => {
      dockMounted = false;
      window.removeEventListener(DOCK_OPEN_EVENT, onOpen);
    };
  }, [layout, open]);
  (0, import_react.useEffect)(() => {
    if (!filePane) return;
    const sync = () => setPluginTabs(filePane.getTabs().slice());
    sync();
    return filePane.subscribe(sync);
  }, [filePane]);
  (0, import_react.useEffect)(() => {
    const sid = typeof getSession === "function" ? getSession() : void 0;
    const aId = tabs.find((tt) => tt.path === path && tt.session === sid)?.id ?? null;
    saveTabs(tabs, aId);
  }, [tabs, path]);
  const toggle = (0, import_react.useCallback)((next) => {
    setOpen(next);
    persistDockOpen(next);
    if (next) layout?.openDetails?.();
    else layout?.closeDetails?.();
  }, [layout]);
  (0, import_react.useEffect)(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyB") {
        e.preventDefault();
        setOpen((o) => {
          const next = !o;
          persistDockOpen(next);
          if (next) layout?.openDetails?.();
          else layout?.closeDetails?.();
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout]);
  (0, import_react.useEffect)(() => {
    const ws = typeof getCwd === "function" ? getCwd() : void 0;
    if (!ws) {
      setGit((g) => ({ ...g, git: false, current: null, branches: [] }));
      return;
    }
    let cancelled = false;
    fetchGitBranch(ws).then((d) => {
      if (cancelled || !d) return;
      setGit({ git: !!d.git, current: d.current ?? null, branches: Array.isArray(d.branches) ? d.branches : [], write: d.write === true });
    });
    return () => {
      cancelled = true;
    };
  }, [getCwd, session, getSession]);
  (0, import_react.useEffect)(() => {
    if (gitView !== "history") return;
    const ws = typeof getCwd === "function" ? getCwd() : void 0;
    if (!ws) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    fetchGitLog(ws, 100).then((entries) => {
      if (!cancelled) setHistory(Array.isArray(entries) ? entries : []);
    });
    return () => {
      cancelled = true;
    };
  }, [gitView, getCwd, session, stamp]);
  (0, import_react.useEffect)(() => {
    if (!themeController) return;
    if (!themeId) {
      themeController.clear();
      return;
    }
    themeController.apply(themeId);
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
    }
  }, [themeId, themeController]);
  (0, import_react.useEffect)(() => {
    if (!themeController) return;
    let saved = "";
    try {
      saved = globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? "";
    } catch {
    }
    const id = saved || defaultTheme || "";
    if (id) setThemeId(id);
    else themeController.clear();
    return () => themeController.dispose?.();
  }, [themeController]);
  (0, import_react.useEffect)(() => {
    if (!changeView) {
      setChanged([]);
      return;
    }
    const ws2 = typeof getCwd === "function" ? getCwd() : void 0;
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
    let liveSource = "push";
    const poll = () => {
      liveSource = "poll";
      load();
      const t2 = setInterval(load, watchFallbackMs);
      return () => clearInterval(t2);
    };
    const startPoll = () => {
      if (liveSource !== "poll") pollCleanup = poll();
    };
    let pollCleanup = null;
    let sock = null, retry = 0, reconnectTimer = null;
    const connect = () => {
      if (cancelled || sock) return;
      try {
        const proto = globalThis.location?.protocol === "https:" ? "wss:" : "ws:";
        sock = new WebSocket(proto + "//" + globalThis.location.host + "/browser/ws");
      } catch {
        startPoll();
        return;
      }
      sock.onopen = () => {
        retry = 0;
      };
      sock.onmessage = (ev) => {
        let frame;
        try {
          frame = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (frame?.type === "status") {
          if (frame.watching === false) {
            setWatching(false);
            startPoll();
          } else {
            setWatching(true);
            if (liveSource === "poll" && pollCleanup) {
              pollCleanup();
              pollCleanup = null;
              liveSource = "push";
            }
          }
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
        const delay = Math.min(1e3 * Math.pow(2, retry), 3e4);
        retry++;
        if (retry > 3) startPoll();
        reconnectTimer = setTimeout(connect, delay);
      };
      sock.onerror = () => {
        try {
          sock?.close();
        } catch {
        }
      };
    };
    connect();
    if (watching === false) {
      pollCleanup = poll();
    }
    load();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        sock?.close();
      } catch {
      }
      if (pollCleanup) pollCleanup();
    };
  }, [changeView, getCwd, session, git.current, stamp]);
  if (!open) return null;
  const effSession = session ?? (typeof getSession === "function" ? getSession() : void 0);
  const base = typeof getCwd === "function" ? getCwd() : void 0;
  const watchFallbackMs = 4e3;
  const viewPath = path ?? base;
  const src = commitTarget ? dockSrc(viewPath, { workspace: base, gitview: "commit", sha: commitTarget.sha }) : dockSrc(viewPath, { diff, session: effSession, workspace: base, blame: blameOn });
  const needSessionNote = diff && isTextPath(viewPath) && effSession === void 0;
  const nav = (next) => {
    setPath(next);
  };
  const openFile = (p) => {
    const sid = effSession;
    const id = tabKey(sid, p);
    if (focusedPane === "bottom" && splitOpen) {
      setBottomTabs((prev) => prev.some((t2) => t2.id === id) ? prev : [...prev, { id, title: basename(p), path: p, session: sid }]);
      setBottomActiveId(id);
      setShowTree(false);
      return;
    }
    setTabs((prev) => prev.some((t2) => t2.id === id) ? prev : [...prev, { id, title: basename(p), path: p, session: sid }]);
    setPath(p);
    setDiff(false);
    setCommitTarget(null);
    setBlameOn(false);
    setShowTree(false);
    setActivePluginId(null);
    persistDockState({ path: p, session: sid });
  };
  const closeBottomTab = (id) => {
    setBottomTabs((prev) => {
      const idx = prev.findIndex((t2) => t2.id === id);
      if (idx < 0) return prev;
      const next = prev.slice();
      next.splice(idx, 1);
      if (id === bottomActiveId) {
        const neighbour = next[idx] || next[idx - 1] || null;
        setBottomActiveId(neighbour ? neighbour.id : null);
      }
      return next;
    });
  };
  const toggleSplit = () => {
    setSplitOpen((open2) => {
      const next = !open2;
      if (next && !bottomActiveId && path) {
        setBottomTabs([{ id: tabKey(effSession, path), title: basename(path), path, session: effSession }]);
        setBottomActiveId(tabKey(effSession, path));
      }
      if (!next) setBottomTabs([]);
      return next;
    });
  };
  const startSplitDrag = (e) => {
    e.preventDefault();
    const editor = rootRef.current?.querySelector(".dshfp-editor");
    if (!editor) return;
    const rect = editor.getBoundingClientRect();
    const move = (ev) => {
      const pct = (ev.clientY - rect.top) / rect.height * 100;
      setSplitPct(Math.max(20, Math.min(80, pct)));
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  const closeTab = (id) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t2) => t2.id === id);
      if (idx < 0) return prev;
      const closed = prev[idx];
      const next = prev.slice();
      next.splice(idx, 1);
      if (closed.path === path && closed.session === effSession) {
        const neighbour = next[idx] || next[idx - 1] || null;
        if (neighbour) {
          setPath(neighbour.path);
          setSession(neighbour.session);
          setDiff(false);
          setCommitTarget(null);
          setBlameOn(false);
          setShowTree(false);
          setActivePluginId(null);
          persistDockState({ path: neighbour.path, session: neighbour.session });
        } else {
          setPath(void 0);
          setSession(void 0);
          setShowTree(true);
          setActivePluginId(null);
        }
      }
      return next;
    });
  };
  const navDir = (p) => {
    setPath(p);
    setDiff(false);
    setShowTree(true);
  };
  const onAct = (v) => {
    if (showTree && changeView === v) setShowTree(false);
    else {
      setChangeView(v);
      setShowTree(true);
    }
    setSearchView(false);
  };
  const onActSearch = () => {
    if (showTree && searchView) setShowTree(false);
    else {
      setChangeView(false);
      setSearchView(true);
      setShowTree(true);
    }
  };
  const openSearchResult = (r) => {
    const p = typeof r?.path === "string" ? r.path : "";
    openFile(base && p ? base + "/" + p.replace(/^\/+/, "") : p);
  };
  const doCheckout = async (b) => {
    setBranchOpen(false);
    setGitErr(null);
    const ws = typeof getCwd === "function" ? getCwd() : void 0;
    if (!ws || b === git.current) return;
    const r = await checkoutGitBranch(ws, b);
    const d = await fetchGitBranch(ws);
    if (d) setGit({ git: !!d.git, current: d.current ?? null, branches: Array.isArray(d.branches) ? d.branches : [] });
    if (r && !r.ok) setGitErr(r.error || "checkout failed");
    setStamp((s) => s + 1);
  };
  const relC = stripBase(viewPath, base);
  const upRel = upPath(relC);
  const navClose = (rel) => nav(base && rel ? base + "/" + rel.replace(/^\/+/, "") : base ?? void 0);
  const openCommit = (sha) => {
    if (!sha || !viewPath) return;
    setPath(viewPath);
    setDiff(false);
    setBlameOn(false);
    setCommitTarget({ sha });
    setStamp((s) => s + 1);
  };
  const doCommit = async () => {
    const ws = typeof getCwd === "function" ? getCwd() : void 0;
    if (!ws || !commitMsg.trim()) return;
    setCommitBusy(true);
    setGitErr(null);
    const r = await commitGit(ws, commitMsg.trim());
    setCommitBusy(false);
    if (r && !r.ok) {
      setGitErr(r.error || "commit failed");
      return;
    }
    setCommitMsg("");
    const d = await fetchGitBranch(ws);
    if (d) setGit({ git: !!d.git, current: d.current ?? null, branches: Array.isArray(d.branches) ? d.branches : [], write: d.write === true });
    setStamp((s) => s + 1);
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: rootRef,
      "data-dsh-file-pane-dock": "1",
      role: "region",
      "aria-label": t?.("dock.title") ?? "File pane",
      className: "dshfp-dock"
    },
    /* @__PURE__ */ React.createElement("style", null, `
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
      `),
    /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-head" }, /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.home") ?? "Files root", onClick: () => {
      navDir(base);
    } }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M2.5 7 8 2.5 13.5 7" }), /* @__PURE__ */ React.createElement("path", { d: "M4 6.5V13h8V6.5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.up") ?? "Up one level", disabled: !path || !upRel, onClick: () => {
      navDir(navClose(upRel));
    } }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M3 10.5 8 5.5l5 5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.reload") ?? "Reload", onClick: () => setStamp((s) => s + 1) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M13 3.5V7h-3.5" }), /* @__PURE__ */ React.createElement("path", { d: "M3 12.5V9h3.5" }), /* @__PURE__ */ React.createElement("path", { d: "M13 7a5 5 0 0 0-8.5-3.5L3 5M13 9l-1.5 1.5A5 5 0 0 1 3 7" }))), /* @__PURE__ */ React.createElement(ThemePicker, { t, value: themeId || "dsh-default", onChange: (id) => setThemeId(id) }), /* @__PURE__ */ React.createElement(Breadcrumb, { path: relC, onNavigate: (rel) => {
      navDir(navClose(rel));
    } }), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.diff") ?? "Version diff", "data-on": diff && isTextPath(path) || void 0, disabled: !isTextPath(path) || path === void 0, onClick: () => setDiff((v) => !v) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 4h4M4 8h4M4 12h4" }), /* @__PURE__ */ React.createElement("path", { d: "M12 3.5v9" }), /* @__PURE__ */ React.createElement("path", { d: "M10.5 5.5 12 4l1.5 1.5M10.5 10.5 12 12l1.5-1.5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.blame") ?? "Blame", "data-on": blameOn || void 0, disabled: !isTextPath(path) || path === void 0, onClick: () => {
      setBlameOn((v) => !v);
      setDiff(false);
      setCommitTarget(null);
    } }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M2.5 5.5 8 2.5l5.5 3v6L8 14.5l-5.5-3z" }), /* @__PURE__ */ React.createElement("path", { d: "M8 8.5 13 5.5M8 8.5 3 5.5M8 8.5V14" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: "Split editor (top / bottom)", "data-on": splitOpen || void 0, onClick: toggleSplit }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M3 3.5h10v4H3zM3 9.5h10v3H3z" }), /* @__PURE__ */ React.createElement("path", { d: "M3 7.5h10", "stroke-dasharray": "1.5 1.5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.openTab") ?? "Open in new tab", onClick: () => window.open(src, "_blank", "noopener") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M6.5 9.5 13 3" }), /* @__PURE__ */ React.createElement("path", { d: "M8.5 3H13v4.5" }), /* @__PURE__ */ React.createElement("path", { d: "M13 9v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H7" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.close") ?? "Close pane", onClick: () => toggle(false) }, "\u2715")),
    needSessionNote ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-note" }, t?.("dock.noSession") ?? "No session available for diff \u2014 open the file from a produced-file chip in chat first.") : null,
    /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-body" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "dshfp-side" + (showTree ? "" : " closed"),
        onMouseLeave: () => {
          setTreeHover(false);
          setHoverAct(null);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "dshfp-rail" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-act", onMouseEnter: () => {
        setHoverAct(false);
        if (!showTree) setTreeHover(true);
      }, "data-on": !changeView || void 0, title: t?.("dock.files") ?? "Files", onClick: () => onAct(false) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M2 4.5a1 1 0 0 1 1-1h3l1.5 2H13a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-act", onMouseEnter: () => {
        setHoverAct(true);
        if (!showTree) setTreeHover(true);
      }, "data-on": changeView || void 0, title: t?.("dock.git") ?? "Git / Changes", onClick: () => onAct(true) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 4h4M4 8h4M4 12h4" }), /* @__PURE__ */ React.createElement("path", { d: "M12 3.5v9" }), /* @__PURE__ */ React.createElement("path", { d: "M10.5 5.5 12 4l1.5 1.5M10.5 10.5 12 12l1.5-1.5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-act", onMouseEnter: () => {
        setHoverAct(false);
        if (!showTree) setTreeHover(true);
      }, "data-on": searchView || void 0, title: t?.("dock.search") ?? "Search", onClick: onActSearch }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("circle", { cx: "7", cy: "7", r: "4.5" }), /* @__PURE__ */ React.createElement("path", { d: "M10.5 10.5 14 14" }))), /* @__PURE__ */ React.createElement("span", { className: "dshfp-sp" }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-act", title: showTree ? t?.("dock.collapseTree") ?? "Collapse" : t?.("dock.revealTree") ?? "Show", onClick: () => setShowTree((v) => !v) }, showTree ? /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M11 4 6 8l5 4" })) : /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5 4l5 4-5 4" })))),
      showTree ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-panel" }, searchView ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-tree dshfp-search", "aria-label": t?.("dock.search") ?? "Search" }, /* @__PURE__ */ React.createElement("div", { className: "dshfp-search-head" }, t?.("dock.search") ?? "Search"), /* @__PURE__ */ React.createElement(SearchSection, { ws: base, t, onOpen: openSearchResult })) : changeView ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-tree dshfp-changes", "aria-label": t?.("dock.git") ?? "Git" }, /* @__PURE__ */ React.createElement("div", { className: "dshfp-changes-head" }, /* @__PURE__ */ React.createElement("span", { className: "dshfp-gv-toggle" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: gitView === "changes" ? "on" : "", onClick: () => setGitView("changes") }, t?.("dock.changesHead") ?? "Changes"), /* @__PURE__ */ React.createElement("button", { type: "button", className: gitView === "history" ? "on" : "", onClick: () => setGitView("history") }, t?.("dock.history") ?? "History"))), gitView === "history" ? history.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-tree-empty" }, "( no history )") : /* @__PURE__ */ React.createElement("div", { className: "dshfp-history" }, history.map((h) => /* @__PURE__ */ React.createElement("button", { type: "button", key: h.sha, className: "dshfp-history-item", "data-sha": h.sha, onClick: () => openCommit(h.sha) }, /* @__PURE__ */ React.createElement("code", { className: "dshfp-history-short" }, h.short), /* @__PURE__ */ React.createElement("span", { className: "dshfp-history-subj" }, h.subject), /* @__PURE__ */ React.createElement("span", { className: "dshfp-history-meta" }, (h.author ?? "").split(" ")[0], " \xB7 ", (h.date ?? "").slice(0, 10))))) : /* @__PURE__ */ React.createElement("div", { className: "dshfp-changes-list" }, changed.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-tree-empty" }, "( working tree clean )") : changed.map((c) => /* @__PURE__ */ React.createElement("button", { type: "button", key: c.path, className: "dshfp-changed-item", onClick: () => {
        setPath(c.path);
        setDiff(true);
        setCommitTarget(null);
        setShowTree(false);
        const sid = effSession;
        if (sid) {
          setSession(sid);
          persistDockState({ path: c.path, session: sid });
        }
      } }, /* @__PURE__ */ React.createElement("span", { className: "dshfp-changed-dot", "data-status": c.status }, c.status === "?" ? "?" : (c.status || "M")[0]), /* @__PURE__ */ React.createElement("span", { className: "nm" }, c.path))), git.write ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-commit" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: commitMsg,
          placeholder: t?.("dock.commitPlaceholder") ?? "Commit message\u2026",
          disabled: commitBusy,
          onChange: (e) => setCommitMsg(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") doCommit();
          }
        }
      ), /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-commit-btn", disabled: commitBusy || !commitMsg.trim(), onClick: doCommit }, t?.("dock.commit") ?? "Commit")) : null)) : /* @__PURE__ */ React.createElement("nav", { className: "dshfp-dock-tree", "aria-label": t?.("dock.tree") ?? "File tree" }, /* @__PURE__ */ React.createElement(FileTree, { path: base, workspace: base, onOpen: openFile, activePath: viewPath }))) : searchView ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-panel dshfp-search-panel" }, /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-tree dshfp-search", "aria-label": t?.("dock.search") ?? "Search" }, /* @__PURE__ */ React.createElement("div", { className: "dshfp-search-head" }, t?.("dock.search") ?? "Search"), /* @__PURE__ */ React.createElement(SearchSection, { ws: base, t, onOpen: openSearchResult }))) : treeHover ? /* @__PURE__ */ React.createElement("nav", { className: "dshfp-dock-tree dshfp-tree-pop", "aria-label": t?.("dock.tree") ?? "File tree", onMouseEnter: () => setTreeHover(true), onMouseLeave: () => setTreeHover(false) }, hoverAct ?? changeView ? changed.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-tree-empty" }, "( working tree clean )") : changed.map((c) => /* @__PURE__ */ React.createElement("button", { type: "button", key: c.path, className: "dshfp-changed-item", onClick: () => {
        setPath(c.path);
        setDiff(true);
        setShowTree(false);
        const sid = effSession;
        if (sid) {
          setSession(sid);
          persistDockState({ path: c.path, session: sid });
        }
      } }, /* @__PURE__ */ React.createElement("span", { className: "dshfp-changed-dot", "data-status": c.status }, c.status === "?" ? "?" : (c.status || "M")[0]), /* @__PURE__ */ React.createElement("span", { className: "nm" }, c.path))) : /* @__PURE__ */ React.createElement(FileTree, { path: base, workspace: base, onOpen: openFile, activePath: viewPath })) : null
    ), /* @__PURE__ */ React.createElement("div", { className: "dshfp-editor" }, splitOpen ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "dshfp-pane", style: { height: splitPct + "%" }, onMouseDown: () => setFocusedPane("top") }, /* @__PURE__ */ React.createElement("div", { className: "dshfp-tabs", role: "tablist", "aria-label": t?.("dock.openTab") ?? "Open tabs" }, tabs.map((tt) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: tt.id,
        className: "dshfp-tab" + (tt.path === path && tt.session === effSession && !activePluginId ? " on" : ""),
        onMouseDown: (e) => {
          if (e.button === 1) {
            e.preventDefault();
            closeTab(tt.id);
          }
        },
        onClick: () => openFile(tt.path),
        title: tt.path ?? ""
      },
      /* @__PURE__ */ React.createElement("span", { className: "dshfp-tab-nm" }, tt.title),
      /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-tab-x", onClick: (e) => {
        e.stopPropagation();
        closeTab(tt.id);
      }, title: t?.("dock.close") ?? "Close", "aria-label": t?.("dock.close") ?? "Close" }, "\u2715")
    )), pluginTabs.map((pt) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: "plugin:" + pt.id,
        className: "dshfp-tab" + (activePluginId === pt.id ? " on" : ""),
        onMouseDown: (e) => {
          if (e.button === 1) {
            e.preventDefault();
            filePane?.closeTab?.(pt.id);
          }
        },
        onClick: () => {
          setActivePluginId(pt.id);
          setShowTree(false);
        },
        title: pt.title ?? pt.id
      },
      /* @__PURE__ */ React.createElement("span", { className: "dshfp-tab-nm" }, pt.title ?? pt.id),
      pt.closable !== false ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-tab-x", onClick: (e) => {
        e.stopPropagation();
        filePane?.closeTab?.(pt.id);
      }, title: t?.("dock.close") ?? "Close", "aria-label": t?.("dock.close") ?? "Close" }, "\u2715") : null
    ))), activePluginId ? (() => {
      const pt = pluginTabs.find((x) => x.id === activePluginId);
      if (!pt) return null;
      const C = pt.component;
      return C ? /* @__PURE__ */ React.createElement(C, { sessionId: effSession }) : /* @__PURE__ */ React.createElement("div", { className: "dshfp-tab-empty" }, t?.("dock.noSession") ?? "No content");
    })() : /* @__PURE__ */ React.createElement("iframe", { key: path + ":" + diff + ":" + stamp, src, title: t?.("dock.title") ?? "File pane" })), /* @__PURE__ */ React.createElement("div", { className: "dshfp-splitter", onMouseDown: startSplitDrag, title: "Drag to resize panes", role: "separator", "aria-orientation": "horizontal" }), /* @__PURE__ */ React.createElement("div", { className: "dshfp-pane", style: { height: 100 - splitPct + "%" }, onMouseDown: () => setFocusedPane("bottom") }, /* @__PURE__ */ React.createElement("div", { className: "dshfp-tabs", role: "tablist", "aria-label": "Bottom tabs" }, bottomTabs.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-tab dshfp-tab-empty-pill" }, "bottom") : bottomTabs.map((tt) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: tt.id,
        className: "dshfp-tab" + (tt.id === bottomActiveId ? " on" : ""),
        onMouseDown: (e) => {
          if (e.button === 1) {
            e.preventDefault();
            closeBottomTab(tt.id);
          }
        },
        onClick: () => setBottomActiveId(tt.id),
        title: tt.path ?? ""
      },
      /* @__PURE__ */ React.createElement("span", { className: "dshfp-tab-nm" }, tt.title),
      /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-tab-x", onClick: (e) => {
        e.stopPropagation();
        closeBottomTab(tt.id);
      }, title: t?.("dock.close") ?? "Close", "aria-label": t?.("dock.close") ?? "Close" }, "\u2715")
    ))), (() => {
      const ba = bottomTabs.find((tt) => tt.id === bottomActiveId) || null;
      if (!ba) return /* @__PURE__ */ React.createElement("div", { className: "dshfp-tab-empty" }, "Split pane \u2014 focus it, then open a file from the tree / a produced-file chip to view two files at once.");
      const bs = dockSrc(ba.path, { session: ba.session, workspace: base });
      return /* @__PURE__ */ React.createElement("iframe", { key: "b:" + ba.path + ":" + stamp, src: bs, title: t?.("dock.title") ?? "File pane" });
    })())) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "dshfp-tabs", role: "tablist", "aria-label": t?.("dock.openTab") ?? "Open tabs" }, tabs.map((tt) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: tt.id,
        className: "dshfp-tab" + (tt.path === path && tt.session === effSession && !activePluginId ? " on" : ""),
        onMouseDown: (e) => {
          if (e.button === 1) {
            e.preventDefault();
            closeTab(tt.id);
          }
        },
        onClick: () => openFile(tt.path),
        title: tt.path ?? ""
      },
      /* @__PURE__ */ React.createElement("span", { className: "dshfp-tab-nm" }, tt.title),
      /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-tab-x", onClick: (e) => {
        e.stopPropagation();
        closeTab(tt.id);
      }, title: t?.("dock.close") ?? "Close", "aria-label": t?.("dock.close") ?? "Close" }, "\u2715")
    )), pluginTabs.map((pt) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: "plugin:" + pt.id,
        className: "dshfp-tab" + (activePluginId === pt.id ? " on" : ""),
        onMouseDown: (e) => {
          if (e.button === 1) {
            e.preventDefault();
            filePane?.closeTab?.(pt.id);
          }
        },
        onClick: () => {
          setActivePluginId(pt.id);
          setShowTree(false);
        },
        title: pt.title ?? pt.id
      },
      /* @__PURE__ */ React.createElement("span", { className: "dshfp-tab-nm" }, pt.title ?? pt.id),
      pt.closable !== false ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-tab-x", onClick: (e) => {
        e.stopPropagation();
        filePane?.closeTab?.(pt.id);
      }, title: t?.("dock.close") ?? "Close", "aria-label": t?.("dock.close") ?? "Close" }, "\u2715") : null
    ))), activePluginId ? (() => {
      const pt = pluginTabs.find((x) => x.id === activePluginId);
      if (!pt) return null;
      const C = pt.component;
      return C ? /* @__PURE__ */ React.createElement(C, { sessionId: effSession }) : /* @__PURE__ */ React.createElement("div", { className: "dshfp-tab-empty" }, t?.("dock.noSession") ?? "No content");
    })() : /* @__PURE__ */ React.createElement("iframe", { key: path + ":" + diff + ":" + stamp, src, title: t?.("dock.title") ?? "File pane" })))),
    gitErr ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-git-err" }, gitErr) : null,
    /* @__PURE__ */ React.createElement("div", { className: "dshfp-status" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-branch", onClick: () => setBranchOpen((o) => !o), title: t?.("dock.branch") ?? "Git branch" }, /* @__PURE__ */ React.createElement("span", { className: "dshfp-branch-ic" }, "\u2442"), /* @__PURE__ */ React.createElement("span", { className: "dshfp-branch-name" }, git.current ?? (git.git ? "(detached)" : "no git")), git.git ? /* @__PURE__ */ React.createElement("span", { className: "dshfp-branch-meta" }, "\u2304") : null), branchOpen ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-branch-menu" }, git.branches.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-branch-item" }, "( no branches )") : git.branches.map((b) => /* @__PURE__ */ React.createElement("button", { key: b, type: "button", className: "dshfp-branch-item" + (b === git.current ? " on" : ""), onClick: () => doCheckout(b) }, b)), /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-branch-item check", onClick: () => setBranchOpen(false) }, "close")) : null, /* @__PURE__ */ React.createElement("span", { className: "dshfp-status-sp" }), /* @__PURE__ */ React.createElement("span", { className: "dshfp-status-changes" }, git.git && changed.length > 0 ? changed.length + " changed" : ""))
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
      getCwd: services.getCwd,
      themeController: services.themeController,
      defaultTheme: services.defaultTheme,
      filePane: services.filePane
    }
  );
}
function isTextPath(p) {
  return /\.(txt|md|markdown|json|ya?ml|csv|tsv|toml|ini|env|gitignore|js|mjs|cjs|tsx?|jsx|py|go|rs|java|c|h|cpp|rb|php|sh|bash|zsh|sql|html?|xml|css|log)$/i.test(p ?? "");
}
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
  const theme = ctx.get("theme");
  if (theme === void 0) {
    throw new Error("dsh-file-pane: ctx.theme missing \u2014 add 'theme' to the bundle-exported inject list in client/index.tsx and @deepseek-ai/dsh-client-ui-theme to dsh.client.inject in package.json");
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
      const record = current != null ? snapshot?.byId?.[current] : void 0;
      return record?.cwd;
    } catch {
      return void 0;
    }
  };
  const resolvePath = (rel) => resolvePanePath(getCwd(), rel);
  ctx.effect(() => ctx.locale.register(NS, {
    en: { "produced.label": "Open in pane", "dock.title": "Files", "dock.close": "Close pane", "dock.openTab": "Open in new tab", "dock.home": "Files root", "dock.up": "Up one level", "dock.reload": "Reload", "dock.diff": "Version diff", "dock.tree": "File tree", "dock.files": "Files", "dock.git": "Git / Changes", "dock.changes": "Changes", "dock.changesHead": "Changes", "dock.branch": "Git branch", "dock.revealTree": "Show file tree", "dock.collapseTree": "Collapse file tree", "dock.noSession": "No session available for diff \u2014 open the file from a produced-file chip in chat first.", "dock.theme": "Theme", "dock.themeDefault": "DSH default", "dock.search": "Search", "dock.history": "History", "dock.commit": "Commit", "dock.commitPlaceholder": "Commit message\u2026", "dock.blame": "Blame" },
    zh: { "produced.label": "\u5728\u9762\u677F\u4E2D\u6253\u5F00", "dock.title": "\u6587\u4EF6", "dock.close": "\u5173\u95ED\u9762\u677F", "dock.openTab": "\u5728\u65B0\u6807\u7B7E\u9875\u6253\u5F00", "dock.home": "\u6587\u4EF6\u6839\u76EE\u5F55", "dock.up": "\u4E0A\u4E00\u7EA7", "dock.reload": "\u5237\u65B0", "dock.diff": "\u7248\u672C\u5BF9\u6BD4", "dock.tree": "\u6587\u4EF6\u6811", "dock.files": "\u6587\u4EF6", "dock.git": "Git / \u66F4\u6539", "dock.changes": "\u66F4\u6539", "dock.changesHead": "\u66F4\u6539", "dock.branch": "Git \u5206\u652F", "dock.revealTree": "\u663E\u793A\u6587\u4EF6\u6811", "dock.collapseTree": "\u6298\u53E0\u6587\u4EF6\u6811", "dock.noSession": "\u5F53\u524D\u65E0\u4F1A\u8BDD\u53EF\u7528\u4E8E\u5BF9\u6BD4 \u2014\u2014 \u8BF7\u5148\u5728\u804A\u5929\u4E2D\u901A\u8FC7\u4EA7\u7269\u6587\u4EF6\u82AF\u7247\u6253\u5F00\u8BE5\u6587\u4EF6", "dock.theme": "\u4E3B\u9898", "dock.themeDefault": "\u9ED8\u8BA4", "dock.search": "\u641C\u7D22", "dock.history": "\u5386\u53F2", "dock.commit": "\u63D0\u4EA4", "dock.commitPlaceholder": "\u63D0\u4EA4\u4FE1\u606F\u2026", "dock.blame": "\u8FFD\u6EAF" }
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
  const themeController = createThemeController(theme, {
    load: () => {
      try {
        return globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? null;
      } catch {
        return null;
      }
    },
    emitter: ctx
  });
  const defaultTheme = resolveInitialPreset(void 0, (() => {
    try {
      return globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  })());
  const filePane = createFilePaneService();
  ctx.provide("filePane", filePane);
  ctx.effect(
    () => filePane.registerFileViewer({ id: "dsh-file-pane:file", extensions: ["*"], component: null }),
    "dsh-file-pane: register file viewer"
  );
  const DockEntry = createDockEntry({ t: ctx.locale.bind(NS), layout, getSession, getCwd, themeController, defaultTheme, filePane });
  slots.inject(
    "details",
    () => slots.register({ name: "details", priority: -1, locale: NS }, DockEntry)
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
