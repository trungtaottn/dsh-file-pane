/**
 * dsh-file-pane / watch
 *
 * Pure-Node workspace watcher: one chokidar instance per workspace root,
 * emitting only workspace-relative `{kind, rel}` dirty tuples coalesced behind
 * a debounce hub. Intentionally has ZERO DSH/cordis imports so it is
 * unit-testable in isolation (mirrors lib/git.mjs).
 *
 * Security contract:
 *   - HARD_IGNORE directories (.git, node_modules, dist, …) are excluded
 *     BEFORE chokidar binds fds.
 *   - `followSymlinks: false` — a symlinked dir is never traversed.
 *   - Every emitted rel is realpath-confirmed inside `root` at emit time
 *     (`#safeRel`); an escape / missing file / `..` yields null → never wired.
 *   - `ENOSPC` flips `supportsWatch` to false so the caller can fall back to
 *     polling (inotify limit on shared hosts).
 */
import { watch } from "chokidar";
import { realpath } from "node:fs/promises";
import { sep } from "node:path";

/** Directories never watched (before any fd binding). */
export const HARD_IGNORE = /(^|[/\\])(\.git|node_modules|dist|\.next|target|\.cache|__pycache__|\.venv|venv)([/\\]|$)/;

/** Default debounce settle window (ms). */
export const DEFAULT_DEBOUNCE_MS = 150;

/** Default per-file settle time for large chunked writes (ms). */
export const DEFAULT_AWF_MS = 2000;

export class WorkspaceWatcher {
	/**
	 * @param {object} opts
	 * @param {string} opts.root - absolute workspace root (already resolved/validated).
	 * @param {(events:Array<{kind:string,rel:string}>) => void} opts.onEvents - burst-coalesced callback.
	 * @param {number} [opts.debounceMs=150] - trailing debounce window.
	 * @param {number} [opts.awaitWriteFinishMs=2000] - per-file settle (size-aware).
	 */
	constructor({ root, onEvents, debounceMs = DEFAULT_DEBOUNCE_MS, awaitWriteFinishMs = DEFAULT_AWF_MS }) {
		this.root = root;
		this.onEvents = onEvents;
		this.debounceMs = debounceMs;
		this.supportsWatch = true;
		this.closed = false;
		this.timer = null;
		this.dirty = new Set(); // "kind:rel"
		this.watcher = null;
		this.#start({ awaitWriteFinishMs });
	}

	#start({ awaitWriteFinishMs }) {
		const root = this.root;
		this.watcher = watch(root, {
			ignored: (p, stats) => {
				if (p === root) return false;
				if (!p.startsWith(root + sep)) return true; // never bind outside root
				return HARD_IGNORE.test(p);
			},
			ignoreInitial: true,
			persistent: true,
			atomic: true,
			awaitWriteFinish: (stats) => (stats?.size > 0 ? awaitWriteFinishMs : 0),
			followSymlinks: false
		});
		this.watcher.on("all", (ev, abs) => {
			if (this.closed) return;
			this.#onRaw(ev, abs);
		});
		this.watcher.on("error", (e) => {
			if (e?.code === "ENOSPC") this.supportsWatch = false;
		});
	}

	/** Coalesce a raw chokidar event into the debounce set (emit-time realpath gate). */
	async #onRaw(ev, abs) {
		const rel = await this.#safeRel(abs);
		if (rel === null) return;
		// Normalize kinds: rename/unlinkDir → unlink; addDir/add → add; change stays.
		const kind =
			ev === "unlink" || ev === "unlinkDir" || ev === "rename" ? "unlink"
				: ev === "addDir" || ev === "add" ? "add"
					: "change";
		this.dirty.add(`${kind}:${rel}`);
		this.#schedule();
	}

	/** realpath-confirm inside root → '/' joined rel, else null. Never absolute. */
	async #safeRel(abs) {
		if (typeof abs !== "string" || !abs) return null;
		const normalized = abs.replaceAll("\\", "/");
		if (normalized.includes("/../") || normalized.endsWith("/..")) return null;
		try {
			const real = await realpath(abs);
			const rootReal = await realpath(this.root);
			if (real === rootReal) return null; // the root itself
			if (!real.startsWith(rootReal + sep)) return null; // symlink escape
			const rel = real.slice(rootReal.length + 1).replaceAll("\\", "/");
			if (!rel || rel.startsWith("..")) return null;
			return rel;
		} catch {
			return null; // missing-file rename burst
		}
	}

	#schedule() {
		if (this.timer) return; // guard re-entrancy: no double-schedule
		this.timer = setTimeout(() => {
			this.timer = null;
			if (this.closed) { this.dirty.clear(); return; }
			const events = [...this.dirty].map((k) => {
				const i = k.indexOf(":");
				return { kind: k.slice(0, i), rel: k.slice(i + 1) };
			});
			this.dirty.clear();
			try { this.onEvents?.(events); } catch { /* never throw into chokidar */ }
		}, this.debounceMs);
	}

	close() {
		this.closed = true;
		if (this.timer) { clearTimeout(this.timer); this.timer = null; }
		this.dirty.clear();
		return this.watcher?.close?.() ?? Promise.resolve();
	}
}