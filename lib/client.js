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
function DockRoot({ t, useSessions: _useSessions, useWorkspaces: _useWorkspaces, layout, getSession, getCwd, themeController, defaultTheme }) {
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
  const [changed, setChanged] = (0, import_react.useState)([]);
  const [git, setGit] = (0, import_react.useState)({ git: false, current: null, branches: [] });
  const [branchOpen, setBranchOpen] = (0, import_react.useState)(false);
  const [themeId, setThemeId] = (0, import_react.useState)(() => {
    try {
      return globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [gitErr, setGitErr] = (0, import_react.useState)(null);
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
    return () => {
      dockMounted = false;
      window.removeEventListener(DOCK_OPEN_EVENT, onOpen);
    };
  }, [layout, open]);
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
      setGit({ git: !!d.git, current: d.current ?? null, branches: Array.isArray(d.branches) ? d.branches : [] });
    });
    return () => {
      cancelled = true;
    };
  }, [getCwd, session, getSession]);
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
    const ws = typeof getCwd === "function" ? getCwd() : void 0;
    if (!ws) return;
    let cancelled = false;
    const load = async () => {
      const c = await fetchGitStatus(ws);
      if (cancelled || !c) return;
      setChanged(Array.isArray(c.changes) ? c.changes.map((e) => ({ path: e.path, status: e.status, staged: !!e.staged })) : []);
    };
    load();
    const t2 = setInterval(load, 4e3);
    return () => {
      cancelled = true;
      clearInterval(t2);
    };
  }, [changeView, getCwd, session, git.current]);
  if (!open) return null;
  const effSession = session ?? (typeof getSession === "function" ? getSession() : void 0);
  const base = typeof getCwd === "function" ? getCwd() : void 0;
  const viewPath = path ?? base;
  const src = dockSrc(viewPath, { diff, session: effSession, workspace: base });
  const needSessionNote = diff && isTextPath(viewPath) && effSession === void 0;
  const nav = (next) => {
    setPath(next);
  };
  const openFile = (p) => {
    setPath(p);
    setDiff(false);
    setShowTree(false);
    persistDockState({ path: p, session: effSession });
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
      `),
    /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-head" }, /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.home") ?? "Files root", onClick: () => {
      navDir(base);
    } }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M2.5 7 8 2.5 13.5 7" }), /* @__PURE__ */ React.createElement("path", { d: "M4 6.5V13h8V6.5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.up") ?? "Up one level", disabled: !path || !upRel, onClick: () => {
      navDir(navClose(upRel));
    } }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M3 10.5 8 5.5l5 5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.reload") ?? "Reload", onClick: () => setStamp((s) => s + 1) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M13 3.5V7h-3.5" }), /* @__PURE__ */ React.createElement("path", { d: "M3 12.5V9h3.5" }), /* @__PURE__ */ React.createElement("path", { d: "M13 7a5 5 0 0 0-8.5-3.5L3 5M13 9l-1.5 1.5A5 5 0 0 1 3 7" }))), /* @__PURE__ */ React.createElement(ThemePicker, { t, value: themeId || "dsh-default", onChange: (id) => setThemeId(id) }), /* @__PURE__ */ React.createElement(Breadcrumb, { path: relC, onNavigate: (rel) => {
      navDir(navClose(rel));
    } }), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.diff") ?? "Version diff", "data-on": diff && isTextPath(path) || void 0, disabled: !isTextPath(path) || path === void 0, onClick: () => setDiff((v) => !v) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 4h4M4 8h4M4 12h4" }), /* @__PURE__ */ React.createElement("path", { d: "M12 3.5v9" }), /* @__PURE__ */ React.createElement("path", { d: "M10.5 5.5 12 4l1.5 1.5M10.5 10.5 12 12l1.5-1.5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.openTab") ?? "Open in new tab", onClick: () => window.open(src, "_blank", "noopener") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M6.5 9.5 13 3" }), /* @__PURE__ */ React.createElement("path", { d: "M8.5 3H13v4.5" }), /* @__PURE__ */ React.createElement("path", { d: "M13 9v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H7" }))), /* @__PURE__ */ React.createElement("button", { type: "button", title: t?.("dock.close") ?? "Close pane", onClick: () => toggle(false) }, "\u2715")),
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
      }, "data-on": changeView || void 0, title: t?.("dock.git") ?? "Git / Changes", onClick: () => onAct(true) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 4h4M4 8h4M4 12h4" }), /* @__PURE__ */ React.createElement("path", { d: "M12 3.5v9" }), /* @__PURE__ */ React.createElement("path", { d: "M10.5 5.5 12 4l1.5 1.5M10.5 10.5 12 12l1.5-1.5" }))), /* @__PURE__ */ React.createElement("span", { className: "dshfp-sp" }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "dshfp-act", title: showTree ? t?.("dock.collapseTree") ?? "Collapse" : t?.("dock.revealTree") ?? "Show", onClick: () => setShowTree((v) => !v) }, showTree ? /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M11 4 6 8l5 4" })) : /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 16 16", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5 4l5 4-5 4" })))),
      showTree ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-panel" }, changeView ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-dock-tree dshfp-changes", "aria-label": t?.("dock.changes") ?? "Changes" }, /* @__PURE__ */ React.createElement("div", { className: "dshfp-changes-head" }, t?.("dock.changesHead") ?? "Changes"), changed.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-tree-empty" }, "( working tree clean )") : changed.map((c) => /* @__PURE__ */ React.createElement("button", { type: "button", key: c.path, className: "dshfp-changed-item", onClick: () => {
        setPath(c.path);
        setDiff(true);
        setShowTree(false);
        const sid = effSession;
        if (sid) {
          setSession(sid);
          persistDockState({ path: c.path, session: sid });
        }
      } }, /* @__PURE__ */ React.createElement("span", { className: "dshfp-changed-dot", "data-status": c.status }, c.status === "?" ? "?" : (c.status || "M")[0]), /* @__PURE__ */ React.createElement("span", { className: "nm" }, c.path)))) : /* @__PURE__ */ React.createElement("nav", { className: "dshfp-dock-tree", "aria-label": t?.("dock.tree") ?? "File tree" }, /* @__PURE__ */ React.createElement(FileTree, { path: base, workspace: base, onOpen: openFile, activePath: viewPath }))) : treeHover ? /* @__PURE__ */ React.createElement("nav", { className: "dshfp-dock-tree dshfp-tree-pop", "aria-label": t?.("dock.tree") ?? "File tree", onMouseEnter: () => setTreeHover(true), onMouseLeave: () => setTreeHover(false) }, hoverAct ?? changeView ? changed.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "dshfp-tree-empty" }, "( working tree clean )") : changed.map((c) => /* @__PURE__ */ React.createElement("button", { type: "button", key: c.path, className: "dshfp-changed-item", onClick: () => {
        setPath(c.path);
        setDiff(true);
        setShowTree(false);
        const sid = effSession;
        if (sid) {
          setSession(sid);
          persistDockState({ path: c.path, session: sid });
        }
      } }, /* @__PURE__ */ React.createElement("span", { className: "dshfp-changed-dot", "data-status": c.status }, c.status === "?" ? "?" : (c.status || "M")[0]), /* @__PURE__ */ React.createElement("span", { className: "nm" }, c.path))) : /* @__PURE__ */ React.createElement(FileTree, { path: base, workspace: base, onOpen: openFile, activePath: viewPath })) : null
    ), /* @__PURE__ */ React.createElement("iframe", { key: path + ":" + diff + ":" + stamp, src, title: t?.("dock.title") ?? "File pane" })),
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
      defaultTheme: services.defaultTheme
    }
  );
}
function isTextPath(p) {
  return /\.(txt|md|markdown|json|ya?ml|csv|tsv|toml|ini|env|gitignore|js|mjs|cjs|tsx?|jsx|py|go|rs|java|c|h|cpp|rb|php|sh|bash|zsh|sql|html?|xml|css|log)$/i.test(p ?? "");
}
function dockSrc(path, { diff = false, session, workspace } = {}) {
  const ws = workspace ? "&workspace=" + encodeURIComponent(workspace) : "";
  let q = "/browser/?path=" + encodeURIComponent(path ?? "") + ws + "&embed=1";
  if (diff && isTextPath(path)) {
    q = "/browser/?path=" + encodeURIComponent(path) + "&diff=1" + (session ? "&session=" + encodeURIComponent(session) : "") + ws + "&embed=1";
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
    en: { "produced.label": "Open in pane", "dock.title": "Files", "dock.close": "Close pane", "dock.openTab": "Open in new tab", "dock.home": "Files root", "dock.up": "Up one level", "dock.reload": "Reload", "dock.diff": "Version diff", "dock.tree": "File tree", "dock.files": "Files", "dock.git": "Git / Changes", "dock.changes": "Changes", "dock.changesHead": "Changes", "dock.branch": "Git branch", "dock.revealTree": "Show file tree", "dock.collapseTree": "Collapse file tree", "dock.noSession": "No session available for diff \u2014 open the file from a produced-file chip in chat first.", "dock.theme": "Theme", "dock.themeDefault": "DSH default" },
    zh: { "produced.label": "\u5728\u9762\u677F\u4E2D\u6253\u5F00", "dock.title": "\u6587\u4EF6", "dock.close": "\u5173\u95ED\u9762\u677F", "dock.openTab": "\u5728\u65B0\u6807\u7B7E\u9875\u6253\u5F00", "dock.home": "\u6587\u4EF6\u6839\u76EE\u5F55", "dock.up": "\u4E0A\u4E00\u7EA7", "dock.reload": "\u5237\u65B0", "dock.diff": "\u7248\u672C\u5BF9\u6BD4", "dock.tree": "\u6587\u4EF6\u6811", "dock.files": "\u6587\u4EF6", "dock.git": "Git / \u66F4\u6539", "dock.changes": "\u66F4\u6539", "dock.changesHead": "\u66F4\u6539", "dock.branch": "Git \u5206\u652F", "dock.revealTree": "\u663E\u793A\u6587\u4EF6\u6811", "dock.collapseTree": "\u6298\u53E0\u6587\u4EF6\u6811", "dock.noSession": "\u5F53\u524D\u65E0\u4F1A\u8BDD\u53EF\u7528\u4E8E\u5BF9\u6BD4 \u2014\u2014 \u8BF7\u5148\u5728\u804A\u5929\u4E2D\u901A\u8FC7\u4EA7\u7269\u6587\u4EF6\u82AF\u7247\u6253\u5F00\u8BE5\u6587\u4EF6", "dock.theme": "\u4E3B\u9898", "dock.themeDefault": "\u9ED8\u8BA4" }
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
  const DockEntry = createDockEntry({ t: ctx.locale.bind(NS), layout, getSession, getCwd, themeController, defaultTheme });
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
