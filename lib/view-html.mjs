/**
 * dsh-file-pane / view-html
 *
 * Renders the pane-style viewer pages as single self-contained HTML documents.
 * Consumes the mount-agnostic view-core only — swapping this renderer for a
 * client-side React mount (in-app, later) is the intended migration path,
 * leaving view-core and the route untouched.
 *
 * Design: industrial-utilitarian product UI on the DSH dark theme —
 * blue-tinted near-black surfaces, one restrained accent, semantic red/green
 * ONLY on changed lines, monospace + tabular numerals, hairline dividers,
 * visible focus rings, SVG icons (no emoji).
 */
import { isImage, isPdf, isDocx, isText, readFileResult, listDir, renderMarkdown } from "./view-core.mjs";

export function esc(s) {
	return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function q(path) { return encodeURIComponent(path ?? ""); }
function fsb(rel) { return rel ? rel.split("/").pop() : "/"; }
function bpath(rel) { return `/browser/?path=${q(rel)}`; }

/* ── SVG icon set (one family, 1.5 stroke, no emoji) ──────────── */
const IC = {
	home: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7 8 2.5 13.5 7"/><path d="M4 6.5V13h8V6.5"/></svg>',
	up: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 8 5.5l5 5"/></svg>',
	raw: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.5 13 3"/><path d="M8.5 3H13v4.5"/><path d="M13 9v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H7"/></svg>',
	copy: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1"/><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"/></svg>',
	diff: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h4M4 8h4M4 12h4"/><path d="M12 3.5v9"/><path d="M10.5 5.5 12 4l1.5 1.5M10.5 10.5 12 12l1.5-1.5"/></svg>',
	file: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2.5h5l3 3V13.5H4z"/><path d="M9 2.5V6h3"/></svg>',
	folder: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4.5a1 1 0 0 1 1-1h3l1.5 2H13a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/></svg>',
	image: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3" width="11" height="10" rx="1"/><circle cx="6" cy="6.5" r="1"/><path d="m3.5 12 3.5-3.5 2.5 2.5 2-2 1.5 1.5"/></svg>',
	pdf: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2.5h5l3 3V13.5H4z"/><path d="M9 2.5V6h3"/><path d="M5.5 9.5h1M8.5 9.5h2"/></svg>'
};
function ic(name) { return IC[name] ?? IC.file; }

/* ── tokens ─────────────────────────────────────────────────────── */
const PAGE_CSS = `
:root{
  --bg:#0f1117;--panel:#161b26;--panel2:#1c2330;--border:#273041;--border2:#33405c;
  --fg:#eef1f8;--fg-dim:#cdd5e4;--muted:#98a2b8;--faint:#6a7490;
  --accent:#5b96ff;--accent-ink:#0b1220;
  /* Codex dark diff palette (muted, syntax-friendly) */
  --add-bg:#213a2b;--add-fg:#a5e8b8;--add-line:#5fd687;
  --del-bg:#4a221d;--del-fg:#f0a9a4;--del-line:#ff6b6b;
  --gutter-bg:#141922;--gutter-fg:#5d6679;
  --focus:rgba(79,140,255,.55);
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;font-family:var(--sans);background:var(--bg);color:var(--fg);display:flex;flex-direction:column;overflow:hidden;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:4px}
::selection{background:rgba(79,140,255,.28)}

/* top bar */
.bar{display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--panel);border-bottom:1px solid var(--border);min-height:40px;flex:none}
.bar .brand{display:flex;align-items:center;gap:7px;font-weight:650;font-size:13px;letter-spacing:.01em;color:var(--fg);white-space:nowrap}
.bar .brand .logo{display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#4f8cff,#7a5cff);color:#fff}
.bar .crumb{font-family:var(--mono);font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.bar .sp{flex:1}
.bar .actions{display:flex;align-items:center;gap:2px}
.act{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:6px;font-size:12px;color:var(--fg-dim);transition:background .12s ease,color .12s ease}
.act:hover{background:var(--panel2);color:var(--fg)}
.act:active{background:#232b3d}
.act .lb{white-space:nowrap}
@media (max-width:560px){.act .lb{display:none}}

/* body / rail / main */
.body{flex:1;display:flex;min-height:0}
.rail{width:272px;min-width:200px;border-right:1px solid var(--border);background:var(--panel);overflow:auto;padding:6px 0;font-family:var(--mono);font-size:12.5px;display:flex;flex-direction:column;align-items:stretch}
.rail .rhead{padding:8px 12px 4px;font-family:var(--sans);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);flex:none}
.rail a{display:flex;gap:8px;align-items:center;padding:4px 12px;color:var(--fg-dim);text-decoration:none;border-left:2px solid transparent;transition:background .1s ease,color .1s ease;flex:none}
.rail a:hover{background:var(--panel2);color:var(--fg)}
.rail a:active{background:#232b3d}
.rail a .ic{width:15px;flex:none;display:inline-flex;justify-content:center;color:var(--faint)}
.rail a:hover .ic{color:var(--muted)}
.main{flex:1;overflow:auto;padding:18px 24px}
.placeholder{color:var(--faint);font-family:var(--mono);text-align:center;margin-top:34vh}
.note{color:var(--muted);font-size:12px;font-family:var(--mono)}
.mono{font-family:var(--mono)}
.codedoc{background:#0b0e14;border:1px solid var(--border);border-radius:8px;padding:12px 14px;overflow:auto}
img{max-width:100%;border-radius:8px}
iframe{width:100%;height:78vh;border:0;border-radius:8px}

/* text archive (file view) */
.archive{display:grid;grid-template-columns:auto 1fr;grid-auto-rows:minmax(0,auto);font-family:var(--mono);font-size:13px;gap:0 12px;line-height:1.55}
.archive .no{color:var(--faint);text-align:right;user-select:none;padding-right:6px;font-variant-numeric:tabular-nums;position:sticky;left:0;background:var(--bg)}
.archive .code{white-space:pre;padding-right:4px}
.filehead{display:flex;align-items:center;gap:10px;padding:6px 12px;background:var(--panel);border-bottom:1px solid var(--border);font-family:var(--mono);font-size:12px;color:var(--muted);flex-wrap:wrap}
.filehead .p{color:var(--fg-dim)}
.fcol{flex:1;min-height:0;display:flex;flex-direction:column}

/* ── version diff (unified | side-by-side) ───────────────────── */
.diffhead{display:flex;align-items:center;gap:10px;padding:6px 12px;background:var(--panel);border-bottom:1px solid var(--border);font-family:var(--mono);font-size:12px;color:var(--muted);flex-wrap:wrap;min-height:36px}
.diffhead .meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.diffhead .stats{margin-left:auto;display:flex;gap:6px;align-items:center}
.badge{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;font-family:var(--mono);font-size:11.5px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.6}
.badge.add{background:var(--add-bg);color:var(--add-fg)}
.badge.del{background:var(--del-bg);color:var(--del-fg)}
.badge.ctx{background:var(--panel2);color:var(--muted)}
.diffwrap{flex:1;min-height:0;overflow:auto;font-family:var(--mono);font-size:13px;line-height:1.55;background:var(--bg)}
.dview{display:none}
body[data-mode="unified"] .dview.unified,body[data-mode="sbs"] .dview.sbs{display:block}

/* unified (Codex/git style): line-number gutter + sign + content */
.hunkhdr{position:sticky;top:0;background:var(--panel);border-bottom:1px solid var(--border);padding:4px 12px;font-family:var(--mono);font-size:12px;color:var(--accent);z-index:3}
.dline{display:flex;align-items:stretch}
.dline .ln{background:var(--gutter-bg);color:var(--gutter-fg);text-align:right;padding:0 10px 0 8px;min-width:44px;user-select:none;font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}
.dline .sg{width:22px;flex:none;display:grid;place-items:center;font-weight:700;user-select:none}
.dline .tx{white-space:pre;padding:0 12px;flex:1;min-width:0}
.dline.ctx .tx{color:var(--fg-dim)}
.dline.add .ln{background:var(--add-bg);color:var(--add-fg)}
.dline.add .sg{background:var(--add-bg);color:var(--add-line)}
.dline.add .tx{background:var(--add-bg);color:var(--add-fg)}
.dline.del .ln{background:var(--del-bg);color:var(--del-fg)}
.dline.del .sg{background:var(--del-bg);color:var(--del-line)}
.dline.del .tx{background:var(--del-bg);color:var(--del-fg)}

/* side-by-side (two columns + change gutter) */
.diffgrid{display:grid;grid-template-columns:minmax(0,1fr) 22px minmax(0,1fr);min-width:640px}
.diffgrid .colhdr{position:sticky;top:0;background:var(--panel);border-bottom:1px solid var(--border);padding:5px 12px;font-family:var(--sans);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);z-index:3;display:flex;align-items:center;gap:6px}
.diffgrid .colhdr b{color:var(--muted);font-weight:600}
.diffgrid .colhdr .gutter{background:var(--border);width:22px}
.drow{display:contents}
.drow .ln{background:var(--gutter-bg);color:var(--gutter-fg);text-align:right;padding:0 8px;user-select:none;border-right:1px solid var(--border);font-variant-numeric:tabular-nums;white-space:nowrap}
.drow .code{white-space:pre;padding:0 12px;color:var(--fg-dim)}
.drow .code.r{border-left:1px solid var(--border)}
.drow .gutter{display:grid;place-items:center;color:var(--faint);font-size:11px;user-select:none}
.drow.del .ln,.drow.del .code{background:var(--del-bg)}
.drow.del .ln{color:var(--del-fg)}
.drow.del .code{color:var(--del-fg)}
.drow.del .gutter{background:var(--del-bg);color:var(--del-line)}
.drow.add .ln,.drow.add .code{background:var(--add-bg)}
.drow.add .ln{color:var(--add-fg)}
.drow.add .code{color:var(--add-fg)}
.drow.add .gutter{background:var(--add-bg);color:var(--add-line)}
.drow.ctx .gutter{background:var(--bg)}
.drow:hover .code{color:var(--fg)}
.drow.del:hover .code{color:var(--del-fg)}
.drow.add:hover .code{color:var(--add-fg)}
.diffempty{color:var(--faint);font-family:var(--mono);text-align:center;margin-top:30vh;font-size:13px}
@media (max-width:719px){
  .diffgrid{grid-template-columns:1fr;min-width:0}
  .diffgrid .colhdr.r,.diffgrid .colhdr .gutter{display:none}
  .drow .code.r,.drow .gutter{display:none}
  .drow.del .ln,.drow.del .code{border-right:0}
}

/* bottom bar (Codex/tmux status line) */
.statusbar{display:flex;align-items:center;gap:8px;padding:4px 12px;background:var(--panel);border-top:1px solid var(--border);font-family:var(--mono);font-size:11.5px;color:var(--muted);min-height:32px;flex:none;flex-wrap:wrap}
.statusbar .sp{flex:1}
.statusbar .st{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.statusbar .st b{color:var(--fg-dim);font-weight:600}
.toggle{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:6px;font-size:11.5px;color:var(--fg-dim);background:var(--panel2);border:1px solid var(--border)}
.toggle:hover{color:var(--fg);border-color:var(--border2)}
.toggle[data-on]{color:var(--accent);border-color:var(--accent)}

/* markdown preview */
.md-toolbar{display:flex;align-items:center;gap:8px;padding:4px 12px;background:var(--panel);border:1px solid var(--border);border-bottom:0;border-radius:8px 8px 0 0;font-family:var(--mono);font-size:11px;color:var(--muted)}
.md-toolbar .sp{flex:1}
.md-label{letter-spacing:.1em;text-transform:uppercase;font-size:10.5px;color:var(--faint)}
.mdtoggle{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:6px;font-size:11.5px;color:var(--fg-dim);background:var(--panel2);border:1px solid var(--border)}
.mdtoggle:hover{color:var(--fg);border-color:var(--border2)}
.mdtoggle[data-on]{color:var(--accent);border-color:var(--accent)}
.md-body{background:#0b0e14;border:1px solid var(--border);border-radius:0 0 8px 8px;padding:20px 28px;font-size:14px;line-height:1.65;color:var(--fg);width:100%}
.md-body h1,.md-body h2,.md-body h3,.md-body h4{color:var(--fg);line-height:1.25;margin:1.2em 0 .5em;font-weight:650}
.md-body h1{font-size:1.6em;border-bottom:1px solid var(--border);padding-bottom:.3em}
.md-body h2{font-size:1.3em;border-bottom:1px solid var(--border);padding-bottom:.25em}
.md-body h3{font-size:1.1em}
.md-body p{margin:.6em 0}
.md-body a{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
.md-body code{font-family:var(--mono);font-size:.88em;background:var(--panel2);border:1px solid var(--border);border-radius:4px;padding:.1em .35em;color:var(--add-fg)}
.md-body pre.md-code{background:#0a0d13;border:1px solid var(--border);border-radius:8px;padding:12px 14px;overflow:auto;margin:.8em 0}
.md-body pre.md-code code{background:none;border:0;padding:0;color:var(--fg-dim);font-size:13px;line-height:1.55;display:block}
.md-body ul.md-list,.md-body ol.md-list{margin:.6em 0;padding-left:1.6em}
.md-body li{margin:.2em 0}
.md-body blockquote.md-quote{margin:.8em 0;padding:.2em 1em;border-left:3px solid var(--accent);background:var(--panel);border-radius:0 6px 6px 0;color:var(--fg-dim)}
.md-body hr.md-hr{border:0;border-top:1px solid var(--border);margin:1.4em 0}
.md-body table.md-table{border-collapse:collapse;margin:.8em 0;font-size:13px;width:100%}
.md-body .md-table th,.md-body .md-table td{border:1px solid var(--border);padding:5px 10px;text-align:left}
.md-body .md-table th{background:var(--panel);color:var(--fg-dim);font-weight:600}
.md-body .md-table tr:nth-child(2n){background:rgba(255,255,255,.015)}
`;

const PAGE_SHELL = (title, body, extra, bodyAttrs = "") => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>${PAGE_CSS}${extra ?? ""}</style></head><body${bodyAttrs}>${body}</body></html>`;

const TOPBAR = (crumb) => `<div class="bar">
<span class="brand"><span class="logo">${ic("diff")}</span>dsh-file-pane</span>
<span class="crumb">${esc(crumb)}</span>
<div class="sp"></div>
<div class="actions"><a class="act" href="/browser/" title="files root">${ic("home")}<span class="lb">Home</span></a></div>
</div>`;

export function paneDirHTML({ path: rel, entries }) {
	const railItems = entries.map((e) => {
		const sub = rel ? rel + "/" + e.name : e.name;
		const icon = e.dir ? "folder" : e.mime?.startsWith("image/") ? "image" : e.mime === "application/pdf" ? "pdf" : "file";
		return `<a href="${bpath(sub)}"><span class="ic">${ic(icon)}</span><span>${esc(e.name)}</span></a>`;
	}).join("");
	const rail = `<div class="rhead">${esc(rel || "/")}</div>${railItems}`;
	const main = entries.length === 0
		? '<div class="placeholder">( empty )</div>'
		: `<div class="codedoc mono" style="color:var(--muted)">${entries.length} item${entries.length === 1 ? "" : "s"}</div>`;
	return PAGE_SHELL(rel || "/", `${TOPBAR("/")}<div class="body"><div class="rail">${rail}</div><div class="main">${main}</div></div>`);
}

export function paneFileHTML(file) {
	const rel = file.path;
	const name = fsb(rel);
	const up = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
	const diffLink = file.kind === "text" ? `&nbsp;<a class="act" href="${bpath(rel)}&diff=1" title="version diff">${ic("diff")}<span class="lb">diff</span></a>` : "";
	const bar = `<div class="bar">
<span class="brand"><span class="logo">${ic("file")}</span>dsh-file-pane</span>
<span class="crumb">${esc(rel)}</span>
<div class="sp"></div>
<div class="actions">
${up ? `<a class="act" href="${bpath(up)}" title="up">${ic("up")}<span class="lb">up</span></a>` : ""}
${diffLink}
<a class="act" href="/browser/?path=${q(rel)}&raw=1" target="_blank" title="raw bytes">${ic("raw")}<span class="lb">raw</span></a>
<a class="act" href="#" data-copy="${q(rel)}" onclick="navigator.clipboard.writeText(decodeURIComponent(this.dataset.copy));this.querySelector('.lb').textContent='copied'">${ic("copy")}<span class="lb">copy</span></a>
</div></div>`;

	let main;
	if (file.kind === "image") {
		main = `<div class="note">${file.kind} · ${file.size} bytes</div><img src="/browser/?path=${q(rel)}&raw=1" alt="${esc(name)}">`;
	} else if (file.kind === "pdf") {
		// PDF.js viewer (search/zoom/text layer via pdfjs-viewer-element); the
		// native iframe stays as the no-JS / asset-missing fallback.
		main = `<div class="note">${file.kind} · ${file.size} bytes</div>
<iframe id="pdfNative" src="/browser/?path=${q(rel)}&raw=1" style="width:100%;height:78vh"></iframe>
<pdfjs-viewer-element id="pdfViewer" src="/browser/?path=${q(rel)}&raw=1" viewer-css-theme="DARK" style="width:100%;height:78vh;display:none"></pdfjs-viewer-element>
<script>
import('/browser/vendor/pdfjs/pdfjs-viewer-element.js').then(() => {
	var el = document.getElementById('pdfViewer');
	if (!customElements.get('pdfjs-viewer-element')) return;
	el.style.display = 'block';
	document.getElementById('pdfNative').style.display = 'none';
}).catch(() => {});
</script>`;
	} else if (file.kind === "docx") {
		// Converted by the route (mammoth host-side) into safe markdown; the
		// preview/raw toggle mirrors the .md UX. raw bytes still served at &raw=1.
		main = `<div class="fcol"><div class="filehead"><span class="p">${esc(file.path)}</span><span>·</span><span>${file.size} bytes</span><span>·</span><span>docx</span></div><div class="main" style="padding-top:10px">
<div class="md-toolbar"><span class="md-label">docx preview</span><span class="sp"></span><button class="mdtoggle" id="mdToggle" type="button" data-on="1" onclick="toggleMd()">raw</button></div>
<div id="mdPreview" class="md-body">${file.docxHtml ?? "<p class=\"md-p\">( empty )</p>"}</div>
<div id="mdRaw" class="archive" style="display:none">${(file.docxText ?? "").split("\n").map((l, i) => `<div class="no">${i + 1}</div><div class="code c-plain">${esc(l)}</div>`).join("")}</div>
</div></div><script>
function toggleMd(){
	var b=document.getElementById('mdPreview'), r=document.getElementById('mdRaw'), t=document.getElementById('mdToggle');
	if(b.style.display==='none'){b.style.display='block';r.style.display='none';t.dataset.on='1';t.textContent='raw';}
	else{b.style.display='none';r.style.display='block';delete t.dataset.on;t.textContent='preview';}
}
</script>`;
	} else if (file.kind === "text") {
		const isMd = /\.(md|markdown)$/i.test(name);
		const lines = (file.text ?? "").split("\n");
		const { highlight } = highlightFor(name);
		const rows = lines.map((l, i) => `<div class="no">${i + 1}</div><div class="code c-${highlight}" data-ln="${i + 1}">${esc(l)}</div>`).join("");
		const filemeta = `<div class="filehead"><span class="p">${esc(file.path)}</span><span>·</span><span>${file.size} bytes</span><span>·</span><span>${file.mime.split(";")[0]}</span>${file.truncated ? "<span>·</span><span style='color:var(--faint)'>truncated</span>" : ""}</div>`;
		if (isMd) {
			const preview = renderMarkdown(file.text ?? "");
			const toggle = `<button class="mdtoggle" id="mdToggle" type="button" data-on="1" onclick="toggleMd()">raw</button>`;
			const boot = `<script>
function toggleMd(){
	var b=document.getElementById('mdPreview'), r=document.getElementById('mdRaw'), t=document.getElementById('mdToggle');
	if(b.style.display==='none'){b.style.display='block';r.style.display='none';t.dataset.on='1';t.textContent='raw';}
	else{b.style.display='none';r.style.display='block';delete t.dataset.on;t.textContent='preview';}
}
</script>`;
			main = `<div class="fcol">${filemeta}<div class="main" style="padding-top:10px">
<div class="md-toolbar"><span class="md-label">preview</span><span class="sp"></span>${toggle}</div>
<div id="mdPreview" class="md-body">${preview}</div>
<div id="mdRaw" class="archive" style="display:none">${rows}</div>
</div></div>${boot}`;
		} else {
			main = `<div class="fcol">${filemeta}<div class="main" style="padding-top:10px"><div class="archive">${rows}</div></div></div>`;
		}
	} else {
		main = `<div class="note">binary ${file.mime} · ${file.size} bytes</div>
<div class="mono">${esc(name)}</div>`;
	}
	return PAGE_SHELL(`${name} · dsh-file-pane`, `${bar}<div class="body">${main}</div>`);
}

/**
 * Version-diff pane: side-by-side OLD|NEW columns from aligned rows
 * (lib/view-core.mjs diffSides). Industrial-utilitarian: hairline grid,
 * semantic red/green only on changed lines, tabular line numbers, a change
 * gutter between the columns, stats badges.
 */
export function paneDiffHTML(file, mode = "unified") {
	const rel = file.path;
	const name = fsb(rel);
	const up = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
	const a = file.aligned;
	const session = file.session ? ` · session ${esc(file.session)}` : "";
	const hasSpill = file.hasSpill;
	const note = hasSpill ? "trước → sau" : "chưa có bản trước (chỉ hiện bản hiện tại)";
	const initMode = mode === "sbs" ? "sbs" : "unified";

	// ── unified rows (Codex/git style) ──
	const uniRows = (a.rows ?? []).map((r) => {
		const kind = r.kind;
		const ln = kind === "add" ? r.newLn : r.oldLn;
		const sg = kind === "del" ? "−" : kind === "add" ? "+" : "&nbsp;";
		const tx = kind === "add" ? (r.newText ?? "") : (r.oldText ?? "");
		const cls = kind === "ctx" ? "ctx" : kind;
		return `<div class="dline ${cls}"><span class="ln">${ln === -1 ? "" : ln}</span><span class="sg">${sg}</span><span class="tx">${esc(tx)}</span></div>`;
	}).join("");

	// ── side-by-side rows ──
	const sbsRows = (a.rows ?? []).map((r) => {
		const kind = r.kind;
		const ol = r.oldLn === -1 ? "" : String(r.oldLn);
		const nl = r.newLn === -1 ? "" : String(r.newLn);
		const oc = kind === "add" ? "" : esc(r.oldText ?? "");
		const nc = kind === "del" ? "" : esc(r.newText ?? "");
		const g = kind === "del" ? "−" : kind === "add" ? "+" : "&nbsp;";
		const cls = kind === "ctx" ? "ctx" : kind;
		return `<div class="drow ${cls}">
<span class="ln">${ol}</span><span class="code">${oc}</span>
<span class="gutter">${g}</span>
<span class="ln">${nl}</span><span class="code r">${nc}</span>
</div>`;
	}).join("");

	let body;
	if (!hasSpill) {
		body = `<div class="diffempty">Chưa có bản trước cho session này.<br><span style="font-size:12px;color:var(--faint)">Bản trước được ghi nhận khi agent sửa file trong session đang mở; mở lại qua produced-file chip (hoặc thêm &amp;session=&lt;id&gt;) để xem diff.</span></div>`;
	} else if (a.rows?.length) {
		body = `<div class="dview unified"><div class="hunkhdr">@@ ${esc(rel)} @@</div>${uniRows}</div>
<div class="dview sbs"><div class="diffgrid">
<div class="colhdr l"><b>OLD</b> · trước</div><div class="colhdr gutter"></div><div class="colhdr r"><b>NEW</b> · sau</div>
${sbsRows}</div></div>`;
	} else {
		body = `<div class="diffempty">( không có thay đổi để so sánh )</div>`;
	}

	const stats = a
		? `<span class="badge add">+${a.added}</span><span class="badge del">−${a.removed}</span><span class="badge ctx">${a.files} file${a.files === 1 ? "" : "s"}</span>`
		: "";

	const diffText = buildDiffText(a, rel);

	const bar = `<div class="bar">
<span class="brand"><span class="logo">${ic("diff")}</span>dsh-file-pane</span>
<span class="crumb">${esc(rel)}</span>
<div class="sp"></div>
<div class="actions">
${up ? `<a class="act" href="${bpath(up)}" title="up">${ic("up")}<span class="lb">up</span></a>` : ""}
<a class="act" href="${bpath(rel)}" title="current view">${ic("file")}<span class="lb">view</span></a>
<a class="act" href="/browser/?path=${q(rel)}&raw=1" target="_blank" title="raw bytes">${ic("raw")}<span class="lb">raw</span></a>
<a class="act" href="#" data-diff="${q(diffText)}" onclick="navigator.clipboard.writeText(decodeURIComponent(this.dataset.diff));this.querySelector('.lb').textContent='copied'">${ic("copy")}<span class="lb">copy diff</span></a>
</div></div>`;

	const head = `<div class="diffhead">
<span class="meta">diff · ${note}${session}</span>
<span class="stats">${stats}</span>
</div>`;

	const status = `<div class="statusbar">
<span class="st">${ic("file")} <b>${esc(rel)}</b></span>
${file.session ? `<span class="st">session <b>${esc(file.session)}</b></span>` : ""}
<span class="sp"></span>
<span class="st"><b>+${a?.added ?? 0}</b> / <b>−${a?.removed ?? 0}</b></span>
<button class="toggle" id="modeToggle" type="button" data-on="${initMode === "unified" ? "1" : ""}" onclick="toggleDiffMode()">${initMode === "unified" ? "split view" : "unified view"}</button>
</div>`;

	const boot = `<script>
function toggleDiffMode(){
	var b=document.body, t=document.getElementById('modeToggle');
	if(b.dataset.mode==='sbs'){b.dataset.mode='unified';t.dataset.on='1';t.textContent='split view';}
	else{b.dataset.mode='sbs';delete t.dataset.on;t.textContent='unified view';}
	var u=new URL(location.href);u.searchParams.set('mode',b.dataset.mode);history.replaceState(null,'',u);
}
</script>`;

	return PAGE_SHELL(`${name} · diff · dsh-file-pane`, `${bar}${head}<div class="diffwrap">${body}</div>${status}${boot}`, "", ` data-mode="${initMode}"`);
}

/** Build a copyable unified diff text (paths + -/+ lines) from aligned rows. */
function buildDiffText(a, rel) {
	if (!a) return "";
	const lines = [`--- ${rel} (trước)`, `+++ ${rel} (sau)`];
	for (const r of a.rows ?? []) {
		if (r.kind === "del") lines.push(`-${r.oldText}`);
		else if (r.kind === "add") lines.push(`+${r.newText}`);
		else lines.push(` ${r.oldText}`);
	}
	return lines.join("\n");
}

/** Tiny, dependency-free highlighter buckets (kept intentionally minimal). */
function highlightFor(name) {
	const e = (name.split(".").pop() || "").toLowerCase();
	if (["js","ts","tsx","jsx","mjs","cjs"].includes(e)) return "js";
	if (["py"].includes(e)) return "py";
	if (["md","markdown"].includes(e)) return "md";
	if (["json","yaml","yml"].includes(e)) return "json";
	if (["html","htm","xml","svg"].includes(e)) return "html";
	if (["css"].includes(e)) return "css";
	if (["sh","bash","zsh"].includes(e)) return "sh";
	if (["go"].includes(e)) return "go";
	if (["rs"].includes(e)) return "rs";
	return "plain";
}

// Minimal token colouring injected per line so large files stay cheap (line-level regex only).
const HL_CSS = {
	"c-js": ".c-js{color:#d7dcff}.c-js b{color:#7ee787}.c-js i{color:#ff7b72}",
	"c-py": ".c-py{color:#d7dcff}.c-py b{color:#7ee787}.c-py i{color:#79c0ff}",
	"c-md": ".c-md{color:#d7dcff}.c-md b{color:#f0b386}.c-md i{color:#79c0ff}",
	"c-json": ".c-json{color:#d7dcff}.c-json b{color:#79c0ff}",
	"c-html": ".c-html{color:#d7dcff}",
	"c-css": ".c-css{color:#d7dcff}",
	"c-sh": ".c-sh{color:#d7dcff}",
	"c-go": ".c-go{color:#d7dcff}",
	"c-rs": ".c-rs{color:#d7dcff}",
	"c-plain": ".c-plain{color:#e6e9f0}"
};
