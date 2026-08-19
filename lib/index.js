/**
 * dsh-file-pane — host plugin.
 *
 * Registers a read-only web route under the web profile so the DSH web UI can
 * browse/read workspace files from a remote device (homelab) without
 * downloading. The pane UI is rendered by view-html.mjs on top of the
 * security core in view-core.mjs; a future in-app (client-plugin) mount can
 * reuse the same core.
 *
 * Route (prefix `/browser`):
 *   /browser/                             -> files root (pane directory listing)
 *   /browser/?path=<rel>                  -> pane file view, or directory listing if a dir
 *   /browser/?path=<rel>&raw=1            -> raw bytes (image/pdf/binary/text)
 *   /browser/?path=<rel>&diff=1&session=S -> version diff (old→new) from RAM spill
 *
 * Spill API (POST, same origin, from the client-plugin):
 *   /browser/api/spill  body { session, path, old, new, ts }
 *                        -> keeps the before/after of agent edits per session
 *                           in RAM only (session-scoped, LRU-capped; nothing
 *                           touches disk, nothing survives a restart).
 */
import { readFileResult, listDir, diffSides, renderMarkdown, resolveWithin, contentLines, attachInlineMarks, ViewError } from "./view-core.mjs";
import { paneDirHTML, paneFileHTML, paneDiffHTML } from "./view-html.mjs";
import { docxPreview } from "./docx.mjs";
import { isGitRepo, currentBranch, listBranches, listChanges, checkoutBranch } from "./git.mjs";
import { isValidPattern as isValidSearchPattern, searchStream, clampMax, sanitizeGlobs } from "./search.mjs";
import { readFile } from "node:fs/promises";
import { realpath } from "node:fs/promises";
import { join, basename, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS_DIR = resolve(fileURLToPath(new URL("../assets/pdfjs", import.meta.url)));
const PDFJS_MIME = { ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".wasm": "application/wasm" };

export const name = "dsh-file-pane";
export const inject = ["webServer"];

/** Per-process RAM spill store, keyed session -> path -> {old,new,ts}. */
const spillStore = new Map(); // session -> Map(path -> {old,new,ts})
const SPILL_MAX_SESSIONS = 8;
const SPILL_MAX_FILES = 400;
const SPILL_MAX_BYTES = 256 * 1024; // cap one side's spill size

function spillFor(session) {
	if (!session) return null;
	let s = spillStore.get(session);
	if (!s) {
		s = new Map();
		spillStore.set(session, s);
		// LRU-evict oldest-inserted session when over the cap.
		if (spillStore.size > SPILL_MAX_SESSIONS) {
			const oldest = spillStore.keys().next().value;
			spillStore.delete(oldest);
		}
	}
	return s;
}

function putSpill(session, path, old, next, ts) {
	const s = spillFor(session);
	if (!s) return;
	s.set(path, { old, new: next, ts: ts ?? Date.now() });
	// Bound file count per session (evict oldest by insertion order).
	if (s.size > SPILL_MAX_FILES) s.delete(s.keys().next().value);
}

function parseQuery(url) {
	const i = url.indexOf("?");
	const q = i === -1 ? "" : url.slice(i + 1);
	const out = {};
	for (const part of q.split("&")) {
		if (!part) continue;
		const eq = part.indexOf("=");
		const k = eq === -1 ? part : part.slice(0, eq);
		const v = eq === -1 ? "" : part.slice(eq + 1);
		try { out[decodeURIComponent(k)] = decodeURIComponent(v); } catch { /* ignore */ }
	}
	return out;
}

function plain(res, status, text) {
	res.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
	res.end(text);
}

function json(res, status, obj) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
	res.end(JSON.stringify(obj));
}

async function readBody(req, limit) {
	let size = 0;
	const chunks = [];
	for await (const chunk of req) {
		size += chunk.length;
		if (size > limit) throw new ViewError("payload too large", 413);
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString("utf8");
}

/**
 * Resolve the effective workspace root for a request. The client sends the
 * active session's cwd as `?workspace=`; we only trust it when it realpaths to
 * an existing directory strictly inside the configured `root` (the hard outer
 * boundary). Anything else falls back to `root` — so a caller can never widen
 * the pane beyond what the operator configured.
 */
async function resolveWorkspaceRoot(root, workspace) {
	if (!workspace || typeof workspace !== "string") return root;
	let real;
	try { real = await realpath(workspace); } catch { return root; }
	if (real === root) return real;
	if (real.startsWith(root + sep)) return real;
	return root;
}

export function apply(ctx, config = {}) {
	const root = config.workspaceRoot || config.root || process.env.HOME || "/";
	const maxTextBytes = config.maxTextBytes ?? 2 * 1024 * 1024;
	// Per-feature search defaults (Phase 3): host is authoritative for enum /
	// clamp / allow-list. Client can override per-search but these seed it.
	const searchCfg = {
		mode: config.searchMode === "name" ? "name" : "content",
		globs: sanitizeGlobs(config.searchGlobs ?? ""),
		max: clampMax(config.searchMax ?? 200)
	};
	// Per-feature syntax-highlight/windowing settings (Phase 5): validated +
	// clamped; missing keys fall back to safe defaults so existing deployments
	// keep current behavior with no config present.
	const hlSettings = {
		enabledLangs: Array.isArray(config.enabledLangs) && config.enabledLangs.length
			? config.enabledLangs.filter((x) => typeof x === "string")
			: undefined, // undefined → highlight module default set
		followEnvTheme: config.followEnvTheme !== false,
		windowingThreshold: Number.isFinite(Number(config.windowingThreshold)) ? Math.max(0, Number(config.windowingThreshold)) : 100_000,
		windowLines: Math.max(10, Number.parseInt(config.windowLines, 10) || 1000)
	};
	ctx.logger?.info?.(`[dsh-file-pane] workspace root=${root}`);

	ctx.webServer.register({
		kind: "prefix",
		path: "/browser",
		handler: async (req, res) => {
			try {
				const url = req.url ?? "/";
				const { path: rel, raw, diff, session, mode, embed, json: asJson, workspace, branch, q, case: caseParam, globs, max, dir, window: winParam, lines: linesParam, meta } = parseQuery(url);
				const pathname = decodeURIComponent(new URL(url, "http://x").pathname);
				const emb = embed === "1";
				// Effective workspace root for this request (session cwd, validated
				// inside the configured root) — scopes the pane to the active
				// workspace instead of exposing the whole configured root.
				const ws = await resolveWorkspaceRoot(root, workspace);

				// ── GET /browser/vendor/pdfjs/<file>: pdfjs-viewer-element assets. ──
				// Basename-only + resolve-inside-guard; nothing outside assets/pdfjs
				// is ever reachable here.
				const VENDOR = "/browser/vendor/pdfjs/";
				if (req.method === "GET" && pathname.startsWith(VENDOR)) {
					const name = basename(pathname.slice(VENDOR.length));
					if (!name || name === "." || name === "..") return plain(res, 404, "not found");
					const target = resolve(join(ASSETS_DIR, name));
					if (!target.startsWith(ASSETS_DIR + sep)) return plain(res, 403, "forbidden");
					let buf;
					try { buf = await readFile(target); } catch { return plain(res, 404, "not found"); }
					res.writeHead(200, {
						"content-type": PDFJS_MIME[extname(name)] ?? "application/octet-stream",
						"cache-control": "public, max-age=86400",
						"content-length": buf.length
					});
					return void res.end(buf);
				}

				// ── POST /browser/api/spill: accept before/after from the client-plugin. ──
				if (req.method === "POST" && pathname.endsWith("/api/spill")) {
					let body;
					try { body = JSON.parse(await readBody(req, 1 * 1024 * 1024)); }
					catch { return plain(res, 400, "invalid json body"); }
					const { session: sid, path: p, old: o, new: n } = body ?? {};
					if (!sid || typeof p !== "string" || p.length === 0) return plain(res, 400, "missing session/path");
					if (typeof o !== "string" && o !== null) return plain(res, 400, "old must be string or null");
					if (typeof n !== "string") return plain(res, 400, "new must be string");
					if ((o?.length ?? 0) > SPILL_MAX_BYTES || n.length > SPILL_MAX_BYTES) return plain(res, 413, "spill too large");
					// Path guard: spill must stay inside the workspace root (same core as reads).
					await readFileResult(root, p, { maxTextBytes }); // throws 403/404 outside root
					putSpill(sid, p, o, n, body.ts);
					return json(res, 200, { ok: true });
				}

				// ── GET /browser/api/changed?session=S: list files edited this session ──
				// Read-only lens over the per-session RAM spill store: path + status
				// (added = no prior version captured, else modified) + last-write ts.
				// All paths were root-validated at spill time; this only echoes them back.
				if (req.method === "GET" && pathname === "/browser/api/changed") {
					if (!session) return plain(res, 400, "missing session");
					const m = spillStore.get(session);
					const entries = m
						? [...m.entries()]
							.map(([p, v]) => ({ path: p, status: v.old == null ? "added" : "modified", ts: v.ts ?? 0 }))
							.sort((a, b) => b.ts - a.ts)
						: [];
					return json(res, 200, { session, entries });
				}

				// ── Git lens: workspace-scoped, read-mostly. `workspace` is the
				//    active session cwd (validated inside the configured root above);
				//    every git call runs with cwd=ws and strict branch validation.
				//  GET /browser/api/git/branch?workspace=W  -> { ok, git, current, branches }
				//  GET /browser/api/git/status?workspace=W  -> { ok, git, changes }
				//  POST /browser/api/git/checkout?workspace=W&branch=B -> { ok, current, error? }
				if (req.method === "GET" && pathname === "/browser/api/git/branch") {
					const git = await isGitRepo(ws);
					if (!git) return json(res, 200, { ok: true, git: false, current: null, branches: [] });
					return json(res, 200, { ok: true, git: true, current: await currentBranch(ws), branches: await listBranches(ws) });
				}
				if (req.method === "GET" && pathname === "/browser/api/git/status") {
					const git = await isGitRepo(ws);
					if (!git) return json(res, 200, { ok: true, git: false, changes: [] });
					return json(res, 200, { ok: true, git: true, changes: await listChanges(ws) });
				}
				if (req.method === "POST" && pathname === "/browser/api/git/checkout") {
					const git = await isGitRepo(ws);
					if (!git) return json(res, 400, { ok: false, error: "not a git repository" });
					if (!workspace) return json(res, 400, { ok: false, error: "missing workspace" });
					const br = typeof branch === "string" ? branch : "";
					const result = await checkoutBranch(ws, br);
					return json(res, result.ok ? 200 : 400, { ok: result.ok, current: result.current, error: result.error });
				}

				// ── GET /browser/api/search: NDJSON workspace search (ripgrep). ──
				// Streams {t:'meta'|'file'|'match'|'done'|'error'} records. Root-scoped,
				// read-only; every emitted path re-validated through resolveWithin so a
				// symlink that escapes `ws` yields no served record.
				if (req.method === "GET" && pathname === "/browser/api/search") {
					// Default to config mode unless the client passes an explicit one.
					const searchMode = (mode === "name" || mode === "content") ? mode : searchCfg.mode;
					// Validate/coerce params (client-provided or config-seeded).
					const pattern = typeof q === "string" ? q : "";
					if (searchMode !== "name" && !isValidSearchPattern(pattern)) {
						return plain(res, 400, "invalid search pattern");
					}
					const startDir = typeof dir === "string" && dir ? dir : ".";
					try { await resolveWithin(ws, startDir); } // 403 on escape
					catch { return plain(res, 403, "forbidden: search dir escapes workspace root"); }
					const modeCase = typeof caseParam === "string" && ["sensitive", "insensitive"].includes(caseParam) ? caseParam : "smart";
					const globsRaw = globs ?? (searchCfg.globs.length ? searchCfg.globs.join(",") : "");
					const maxCap = clampMax(max ?? searchCfg.max);
					res.writeHead(200, {
						"content-type": "application/x-ndjson; charset=utf-8",
						"cache-control": "no-store"
					});
					// killRef exposes the spawned rg child so `req.on('close')` can
					// kill it when the client aborts/supersedes the request.
					const killRef = {};
					req.on("close", () => { try { killRef.kill?.(); } catch {} });
					let searchAborted = false;
					req.on("aborted", () => { searchAborted = true; });
					for await (const rec of searchStream(ws, {
						q: pattern,
						mode: searchMode,
						case: modeCase,
						globs: globsRaw,
						max: maxCap,
						dir: startDir,
						maxInMs: 20000,
						killRef
					})) {
						if (searchAborted) { try { killRef.kill?.(); } catch {} break; }
						res.write(JSON.stringify(rec) + "\n");
					}
					res.end();
					return;
				}


				// ── GET with diff=1: render the version diff (old→new) from spill. ──
				if (diff === "1") {
					if (!rel) return plain(res, 400, "missing ?path=");
					const f = await readFileResult(ws, rel, { maxTextBytes });
					if (f.kind !== "text") return plain(res, 415, "diff only for text files");
					const current = f.text ?? "";
					const spilled = session ? spillStore.get(session)?.get(rel) : undefined;
					const old = spilled ? spilled.old : null; // null = no known prior version
					const aligned = diffSides(old, current);
					// Phase 4: intraline marks on changed/paired lines (gated by INLINE_MAX).
					attachInlineMarks(aligned.rows);
					res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
					return void res.end(paneDiffHTML({ ...f, aligned, session, hasSpill: spilled !== undefined }, mode, emb));
				}

				// ── raw bytes requested -> serve exactly that file's bytes. ──
				if (raw === "1") {
					if (!rel) return plain(res, 400, "missing ?path=");
					const file = await readFileResult(ws, rel, { maxTextBytes });
					res.writeHead(200, {
						"content-type": file.mime === "application/octet-stream" ? "text/plain; charset=utf-8" : file.mime,
						"content-length": file.buf.length,
						"cache-control": "no-store",
						"content-disposition": "inline"
					});
					return void res.end(file.buf);
				}

				// ── json=1 -> directory listing as JSON (for the dock file tree).
				// Same path guard as HTML listings (resolveWithin); only directories.
				// `rel` may be empty → root listing.
				if (asJson === "1") {
					const listing = await listDir(ws, rel ?? "");
					return json(res, 200, { path: listing.path, entries: listing.entries });
				}

				// ── explicit path -> pane (file) or listing (dir). ──
				if (rel) {
					try {
						const file = await readFileResult(ws, rel, { maxTextBytes });
						if (file.kind === "docx") {
							// Host-side docx → safe markdown preview (XSS-safe pipeline).
							const conv = await docxPreview(file.buf, maxTextBytes);
							if (conv) {
								file.docxHtml = renderMarkdown(conv.md);
								file.docxText = conv.text;
								file.docxTruncated = conv.truncated;
							}
						}
						// Phase 3: ?meta=1 → JSON metadata (no body) for the file.
						if (meta === "1" && file.kind === "text") {
							const totalLines = contentLines(file.text ?? "").length;
							return json(res, 200, { totalLines, size: file.size, mime: file.mime, ext: file.kind });
						}
						// Phase 3 windowing: ?window=N&lines=1000 renders a bounded slice.
						let paneOpts = { settings: hlSettings };
						if (file.kind === "text" && winParam !== undefined) {
							const linesPer = Math.max(1, Number.parseInt(linesParam, 10) || hlSettings.windowLines);
							const win = Math.max(0, Number.parseInt(winParam, 10) || 0);
							const total = contentLines(file.text ?? "").length;
							paneOpts = { ...paneOpts, slice: { start: win * linesPer, lines: linesPer }, total };
						} else if (file.kind === "text") {
							// Large-file fallback: data-large + content-visibility.
							const total = contentLines(file.text ?? "").length;
							paneOpts = { ...paneOpts, dataLarge: total >= hlSettings.windowingThreshold, total };
						}
						res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
						return void res.end(await paneFileHTML(file, emb, paneOpts));
					} catch (err) {
						if (!(err instanceof ViewError && err.status === 400)) throw err; // not a directory read issue
						const listing = await listDir(ws, rel);
						res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
						return void res.end(paneDirHTML(listing, emb));
					}
				}

				// ── no path -> root listing. ──
				const listing = await listDir(ws, "");
				res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
				return void res.end(paneDirHTML(listing, emb));
			} catch (err) {
				const status = err instanceof ViewError ? err.status : 500;
				plain(res, status, err instanceof Error ? err.message : String(err));
			}
		}
	});
}
