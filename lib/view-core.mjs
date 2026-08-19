/**
 * dsh-file-pane / view-core
 *
 * Reusable, mount-agnostic file-viewing core. It owns the ONLY logic that reads
 * the workspace: workspace-root guarding, path traversal / symlink escape
 * prevention, MIME detection, listing, and returns a normalized result. Both
 * the current web route mount (lib/view-html.mjs) and a future in-app client
 * mount (client/) consume THIS — so when DSH gains a stable client-plugin seam,
 * the in-app UI can be added by swapping only the mount, not the security/logic.
 */
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { diffWordsWithSpace } from "diff";

/** Compact MIME table (group 1 text/code/md/json/yaml/csv; group 2 images/pdf). */
export const MIME = {
	".txt": "text/plain; charset=utf-8",
	".md": "text/markdown; charset=utf-8",
	".markdown": "text/markdown; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".yaml": "text/yaml; charset=utf-8",
	".yml": "text/yaml; charset=utf-8",
	".csv": "text/csv; charset=utf-8",
	".tsv": "text/tab-separated-values; charset=utf-8",
	".toml": "text/plain; charset=utf-8",
	".ini": "text/plain; charset=utf-8",
	".env": "text/plain; charset=utf-8",
	".gitignore": "text/plain; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".cjs": "text/javascript; charset=utf-8",
	".ts": "text/typescript; charset=utf-8",
	".tsx": "text/typescript; charset=utf-8",
	".jsx": "text/jsx; charset=utf-8",
	".py": "text/x-python; charset=utf-8",
	".go": "text/x-go; charset=utf-8",
	".rs": "text/rust; charset=utf-8",
	".java": "text/x-java; charset=utf-8",
	".c": "text/x-c; charset=utf-8",
	".h": "text/x-c; charset=utf-8",
	".cpp": "text/x-c++; charset=utf-8",
	".rb": "text/x-ruby; charset=utf-8",
	".php": "text/x-php; charset=utf-8",
	".sh": "text/x-shellscript; charset=utf-8",
	".bash": "text/x-shellscript; charset=utf-8",
	".zsh": "text/x-shellscript; charset=utf-8",
	".sql": "text/x-sql; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".htm": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".xml": "text/xml; charset=utf-8",
	".svg": "image/svg+xml",
	".log": "text/plain; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
	".pdf": "application/pdf",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".wasm": "application/wasm"
};

export const TEXT_RE = /^text\//;
// application/* code-ish mimes that are text and should render as code, not binary:
// json, xml, javascript, yaml, form-encoded, and any structured *+json / *+xml.
const TEXT_APP_RE = /^application\/(json|javascript|xml|x-www-form-urlencoded|yaml)|^application\/.*\+json|^application\/.*\+xml/;
export const IMAGE_RE = /^image\//;
export const DEFAULT_MAX_TEXT = 2 * 1024 * 1024; // 2 MiB render cap (truncate beyond)

/** Extensionless files that are conventionally plain text (case-insensitive). */
const NOEXT_TEXT = new Set([
	"license", "copying", "notice", "authors", "changes", "changelog",
	"readme", "makefile", "dockerfile", "gemfile", "rakefile", "cmakelists",
	"justfile", "procfile", "contributing", "todo"
]);

export function mimeFor(name) {
	const base = String(name ?? "").toLowerCase();
	if (!path.extname(name) && NOEXT_TEXT.has(base)) return "text/plain; charset=utf-8";
	return MIME[path.extname(name).toLowerCase()] ?? "application/octet-stream";
}
export const isText = (mime) => TEXT_RE.test(mime) || TEXT_APP_RE.test(mime);
export const isImage = (mime) => IMAGE_RE.test(mime);
export const isPdf = (mime) => mime === "application/pdf";
export const isDocx = (mime) => mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class ViewError extends Error {
	constructor(message, status) { super(message); this.status = status ?? 500; }
}

/**
 * Safely resolve `rel` inside `root`, rejecting path-traversal and symlink
 * escapes outside the root. Throws ViewError(403) on escape, ViewError(404)
 * when missing.
 *
 * Accepts both workspace-relative paths (`src/app.ts`) and absolute paths that
 * live under `root` (`/home/kaynt/src/app.ts`) — absolute inputs are first
 * relativized against `root`, so the pane treats the configured workspace root
 * as the single base (paths produced by the client-plugin come from a session
 * cwd, which may be any subdirectory).
 *
 * @param root - absolute workspace root.
 * @param rel - user-supplied relative (or absolute-under-root) path.
 * @returns the realpath of the resolved entry, guaranteed under `root`.
 */
export async function resolveWithin(root, rel) {
	let target = rel;
	if (path.isAbsolute(rel)) {
		target = path.relative(root, rel);
		if (target.startsWith("..") || path.isAbsolute(target)) throw new ViewError("forbidden: path escapes workspace root", 403);
	}
	const abs = path.resolve(root, target);
	if (abs !== root && !abs.startsWith(root + path.sep)) throw new ViewError("forbidden: path escapes workspace root", 403);
	let real, st;
	try {
		real = await fs.realpath(abs);
		st = await fs.stat(real);
	} catch { throw new ViewError("not found", 404); }
	if (!real.startsWith(root)) throw new ViewError("forbidden: symlink escapes workspace root", 403);
	return { real, abs, st };
}

/**
 * Read a file (fully) with a size guard. Returns { ok, mime, isText, size, text|bytes }.
 * @param root - workspace root.
 * @param rel - relative path.
 * @param opts.maxTextBytes - truncation cap for text reads.
 */
export async function readFileResult(root, rel, opts = {}) {
	const maxText = opts.maxTextBytes ?? DEFAULT_MAX_TEXT;
	const { real, st } = await resolveWithin(root, rel);
	if (st.isDirectory()) throw new ViewError("is a directory", 400);
	const mime = mimeFor(real);
	const buf = await fs.readFile(real);
	let kind = isImage(mime) ? "image" : isPdf(mime) ? "pdf" : isDocx(mime) ? "docx" : isText(mime) ? "text" : "binary";
	// Unknown extension / extensionless files (LICENSE, Makefile, …): if the
	// bytes are lossless UTF-8 with no NUL bytes, treat as text so they render
	// as code instead of "binary application/octet-stream".
	if (kind === "binary" && isLikelyText(buf)) {
		kind = "text";
	}
	const truncated = st.size > maxText;
	return {
		path: rel, abs: real, mime, kind, size: st.size, truncated,
		text: kind === "text" ? buf.toString("utf8").slice(0, maxText) : undefined,
		buf
	};
}

/** Heuristic: no NUL bytes and the buffer is valid UTF-8 (lossless round-trip). */
export function isLikelyText(buf) {
	if (!buf || buf.length === 0) return false;
	if (buf.includes(0)) return false;
	try {
		return Buffer.from(buf.toString("utf8"), "utf8").equals(buf);
	} catch { return false; }
}

/** List a directory under root; throws when outside root or not a dir. */
export async function listDir(root, rel) {
	const { real, st } = await resolveWithin(root, rel);
	if (!st.isDirectory()) throw new ViewError("not a directory", 400);
	let entries = await fs.readdir(real, { withFileTypes: true });
	entries = entries.sort((a, b) => Number(a.isDirectory()) - Number(b.isDirectory()) || a.name.localeCompare(b.name));
	return {
		path: rel, abs: real,
		entries: entries.map((e) => ({
			name: e.name,
			dir: e.isDirectory(),
			mime: e.isDirectory() ? undefined : mimeFor(e.name)
		}))
	};
}

/** Split a side's text into content lines (no trailing-terminator empty line). */
export function contentLines(text) {
	if (text === undefined || text === null) return [];
	if (text === "") return [];
	return (text.endsWith("\n") ? text.slice(0, -1) : text).split("\n");
}

/**
 * Align `old` and `new` side texts into side-by-side rows (diff alignment).
 *
 * Mount-agnostic: takes plain strings, returns plain rows — the renderer
 * decides visuals. Zero-dependency LCS over lines (longest common subsequence)
 * so unchanged lines stay aligned across both columns; a row has
 * `{ oldLn, oldText, newLn, newText, kind }` where:
 *   - kind "ctx": unchanged line (both sides present)
 *   - kind "del": line removed (old side only, newLn -1)
 *   - kind "add": line added (new side only, oldLn -1)
 * Rows stay in file order; unchanged lines align at the same row index.
 *
 * @param old - prior content ("" or null for a new file).
 * @param new - content after the change.
 * @returns aligned rows plus `{ added, removed, files }` stats.
 */
export function diffSides(old, next) {
	const a = contentLines(old);
	const b = contentLines(next);
	const rows = [];
	// LCS over line texts (with a cheap hash-key dedupe for long files).
	const key = (i) => (typeof a[i] === "string" ? a[i] : "\u0000" + i);
	const n = a.length, m = b.length;
	const dp = new Int32Array((n + 1) * (m + 1));
	const W = m + 1;
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i * W + j] = key(i) === b[j]
				? dp[(i + 1) * W + (j + 1)] + 1
				: Math.max(dp[(i + 1) * W + j], dp[i * W + (j + 1)]);
		}
	}
	// Walk the DP table to emit rows in file order.
	let i = 0, j = 0;
	let added = 0, removed = 0;
	while (i < n && j < m) {
		if (key(i) === b[j]) {
			rows.push({ oldLn: i + 1, oldText: a[i], newLn: j + 1, newText: b[j], kind: "ctx" });
			i++; j++;
		} else if (dp[(i + 1) * W + j] >= dp[i * W + (j + 1)]) {
			rows.push({ oldLn: i + 1, oldText: a[i], newLn: -1, newText: "", kind: "del" });
			removed++; i++;
		} else {
			rows.push({ oldLn: -1, oldText: "", newLn: j + 1, newText: b[j], kind: "add" });
			added++; j++;
		}
	}
	while (i < n) { rows.push({ oldLn: i + 1, oldText: a[i], newLn: -1, newText: "", kind: "del" }); removed++; i++; }
	while (j < m) { rows.push({ oldLn: -1, oldText: "", newLn: j + 1, newText: b[j], kind: "add" }); added++; j++; }
	return { rows, added, removed, files: 1 };
}

/* ── Intraline diff (jsdiff diffWordsWithSpace, gated by INLINE_MAX) ── */

/** Row-count ceiling above which the intraline pass is skipped entirely. */
export const INLINE_MAX = 5000;

/**
 * Tokenize a changed line pair into inline change segments via
 * diffWordsWithSpace. Returns { old: [{text,type}], next: [{text,type}] }
 * where type ∈ "ch" (unchanged) | "del" (removed, old side) | "add" (added,
 * next side). jsdiff only tokenizes text; the renderer always esc()s segments.
 */
export function inlineWords(oldText, nextText) {
	const parts = diffWordsWithSpace(String(oldText ?? ""), String(nextText ?? ""));
	const old = [], next = [];
	for (const p of parts) {
		if (p.removed) { old.push({ text: p.value, type: "del" }); }
		else if (p.added) { next.push({ text: p.value, type: "add" }); }
		else { old.push({ text: p.value, type: "ch" }); next.push({ text: p.value, type: "ch" }); }
	}
	return { old, next };
}

/**
 * Pair each `del` row with the nearest following unmatched `add` (within a
 * small context window) and attach `inline` marks ({old,next} segment arrays)
 * to both rows. Only runs when `rows.length <= INLINE_MAX`. Rows beyond the
 * threshold keep the fast row-level path (no jsdiff run). Pure; does not
 * mutate diffSides output shape beyond adding `row.inline`.
 */
export function attachInlineMarks(rows) {
	if (!Array.isArray(rows) || rows.length > INLINE_MAX) return rows;
	const used = new Set();
	for (let i = 0; i < rows.length; i++) {
		const r = rows[i];
		if (r.kind !== "del" || used.has(i)) continue;
		// nearest unmatched add within ±24 rows after this del
		for (let j = i + 1; j < rows.length && j <= i + 24; j++) {
			const s = rows[j];
			if (s.kind === "add" && !used.has(j)) {
				const seg = inlineWords(r.oldText, s.newText);
				r.inline = seg;
				s.inline = seg;
				used.add(i); used.add(j);
				break;
			}
			if (s.kind === "ctx") break; // context breaks the change block
		}
	}
	return rows;
}

/** Escape HTML metacharacters (XSS-safe base for markdown rendering). */
export function escapeHtml(s) {
	return String(s)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

/**
 * Zero-dependency, XSS-safe Markdown renderer.
 *
 * Input is HTML-escaped FIRST, then block/inline tokens are applied to the
 * escaped text — so raw HTML in the source is inert (rendered as text), never
 * executed. Supports: headings, fenced code blocks (with optional language),
 * inline code, bold/italic, unordered/ordered lists, links, blockquotes,
 * horizontal rules, tables (pipe), and paragraphs.
 *
 * @param src - raw markdown source.
 * @returns HTML string (safe to inject into a page).
 */
export function renderMarkdown(src) {
	const lines = String(src ?? "").replace(/\r\n/g, "\n").split("\n");
	const out = [];
	let i = 0;

	const inline = (s) => {
		let t = escapeHtml(s);
		// inline code first (protect from other tokens)
		t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
		// bold **x** / __x__
		t = t.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`);
		// italic *x* / _x_
		t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)|(^|[^_])_([^_\n]+)_(?!_)/g, (_, p1, a, p2, b) => `${p1 ?? p2 ?? ""}<em>${a ?? b}</em>`);
		// links [text](url) — url stays escaped, href allowlisted to http(s)/mailto
		t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => {
			const u = escapeHtml(url);
			const safe = /^(https?:|mailto:)/.test(url) ? u : "#";
			return `<a href="${safe}" target="_blank" rel="noopener">${txt}</a>`;
		});
		return t;
	};

	while (i < lines.length) {
		const line = lines[i];

		// fenced code block
		const fence = line.match(/^```(\S*)\s*$/);
		if (fence) {
			const lang = fence[1];
			const buf = [];
			i++;
			while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
			i++; // skip closing fence
			out.push(`<pre class="md-code${lang ? ` lang-${escapeHtml(lang)}` : ""}"><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
			continue;
		}

		// heading
		const h = line.match(/^(#{1,6})\s+(.*)$/);
		if (h) {
			const lvl = h[1].length;
			out.push(`<h${lvl} class="md-h">${inline(h[2])}</h${lvl}>`);
			i++;
			continue;
		}

		// horizontal rule
		if (/^(\s*([-*_])\s*){3,}$/.test(line)) {
			out.push("<hr class=\"md-hr\">");
			i++;
			continue;
		}

		// blockquote (consecutive > lines)
		if (/^>\s?/.test(line)) {
			const buf = [];
			while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
			out.push(`<blockquote class="md-quote">${inline(buf.join("\n"))}</blockquote>`);
			continue;
		}

		// unordered / ordered list (consecutive items)
		const li = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
		if (li) {
			const ordered = /^\d+\./.test(li[2]);
			const items = [];
			const start = ordered ? parseInt(li[2], 10) : null;
			while (i < lines.length) {
				const m = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
				if (!m) break;
				items.push(`<li>${inline(m[3])}</li>`);
				i++;
			}
			const tag = ordered ? "ol" : "ul";
			out.push(`<${tag} class="md-list"${start !== null && start !== 1 ? ` start="${start}"` : ""}>${items.join("")}</${tag}>`);
			continue;
		}

		// table (header row + separator + rows)
		if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])) {
			const rows = [];
			const parseRow = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
			const header = parseRow(line);
			i += 2;
			const body = [];
			while (i < lines.length && lines[i].includes("|")) { body.push(parseRow(lines[i])); i++; }
			rows.push(`<thead><tr>${header.map((c) => `<th>${c}</th>`).join("")}</tr></thead>`);
			if (body.length) rows.push(`<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`);
			out.push(`<table class="md-table">${rows.join("")}</table>`);
			continue;
		}

		// blank line
		if (line.trim() === "") { i++; continue; }

		// paragraph: consume until blank line
		const para = [line];
		i++;
		while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,6}\s|```|>\s?|(\s*)([-*+]|\d+\.)\s+)/.test(lines[i])) { para.push(lines[i]); i++; }
		out.push(`<p class="md-p">${inline(para.join(" "))}</p>`);
	}
	return out.join("\n");
}
