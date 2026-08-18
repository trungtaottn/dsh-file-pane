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
import { readFileResult, listDir, diffSides, renderMarkdown, ViewError } from "./view-core.mjs";
import { paneDirHTML, paneFileHTML, paneDiffHTML } from "./view-html.mjs";
import { docxPreview } from "./docx.mjs";
import { readFile } from "node:fs/promises";
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

export function apply(ctx, config = {}) {
	const root = config.workspaceRoot || config.root || process.env.HOME || "/";
	const maxTextBytes = config.maxTextBytes ?? 2 * 1024 * 1024;
	ctx.logger?.info?.(`[dsh-file-pane] workspace root=${root}`);

	ctx.webServer.register({
		kind: "prefix",
		path: "/browser",
		handler: async (req, res) => {
			try {
				const url = req.url ?? "/";
				const { path: rel, raw, diff, session, mode } = parseQuery(url);
				const pathname = decodeURIComponent(new URL(url, "http://x").pathname);

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

				// ── GET with diff=1: render the version diff (old→new) from spill. ──
				if (diff === "1") {
					if (!rel) return plain(res, 400, "missing ?path=");
					const f = await readFileResult(root, rel, { maxTextBytes });
					if (f.kind !== "text") return plain(res, 415, "diff only for text files");
					const current = f.text ?? "";
					const spilled = session ? spillStore.get(session)?.get(rel) : undefined;
					const old = spilled ? spilled.old : null; // null = no known prior version
					const aligned = diffSides(old, current);
					res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
					return void res.end(paneDiffHTML({ ...f, aligned, session, hasSpill: spilled !== undefined }, mode));
				}

				// ── raw bytes requested -> serve exactly that file's bytes. ──
				if (raw === "1") {
					if (!rel) return plain(res, 400, "missing ?path=");
					const file = await readFileResult(root, rel, { maxTextBytes });
					res.writeHead(200, {
						"content-type": file.mime === "application/octet-stream" ? "text/plain; charset=utf-8" : file.mime,
						"content-length": file.buf.length,
						"cache-control": "no-store",
						"content-disposition": "inline"
					});
					return void res.end(file.buf);
				}

				// ── explicit path -> pane (file) or listing (dir). ──
				if (rel) {
					try {
						const file = await readFileResult(root, rel, { maxTextBytes });
						if (file.kind === "docx") {
							// Host-side docx → safe markdown preview (XSS-safe pipeline).
							const conv = await docxPreview(file.buf, maxTextBytes);
							if (conv) {
								file.docxHtml = renderMarkdown(conv.md);
								file.docxText = conv.text;
								file.docxTruncated = conv.truncated;
							}
						}
						res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
						return void res.end(paneFileHTML(file));
					} catch (err) {
						if (!(err instanceof ViewError && err.status === 400)) throw err; // not a directory read issue
						const listing = await listDir(root, rel);
						res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
						return void res.end(paneDirHTML(listing));
					}
				}

				// ── no path -> root listing. ──
				const listing = await listDir(root, "");
				res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
				return void res.end(paneDirHTML(listing));
			} catch (err) {
				const status = err instanceof ViewError ? err.status : 500;
				plain(res, status, err instanceof Error ? err.message : String(err));
			}
		}
	});
}
