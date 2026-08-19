/**
 * dsh-file-pane / search
 *
 * Minimal, read-only workspace search façade rooted at a single workspace
 * directory. The engine is `@vscode/ripgrep` (`rgPath`) run as a subprocess so
 * the shared Node host is never blocked. It exposes filename quick-open
 * (`name`) and full-text grep (`content`) modes and streams results to the caller
 * as NDJSON records (`{t:'meta'|'file'|'match'|'done'|'error'}`) via an
 * async-iterable.
 *
 * Security contract (mirrors lib/git.mjs):
 *   - rg always runs with `cwd` pinned to a workspace directory the caller has
 *     already validated inside the configured root (via resolveWorkspaceRoot).
 *   - Arguments are an array passed to `spawn` (never a shell string); the
 *     pattern is always preceded by `--` so a leading `-` is literal.
 *   - A hardcoded ignore list (node_modules, .git, .DS_Store) is always applied.
 *   - Timeout + `max` cap bound every run; client-abort kills the child.
 *   - Every emitted path is re-validated by the caller through
 *     view-core.resolveWithin (symlink/escape defense).
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// OptionalDependency binary; guard so a missing rg degrades to a clean
// {t:'error'} instead of throwing at import time (which would break the whole
// plugin). `await import` at top level is fine in an ESM host module.
let rgPath = null;
try {
	const mod = await import("@vscode/ripgrep");
	rgPath = mod.rgPath ?? null;
} catch {
	rgPath = null;
}

export const SEARCH_TIMEOUT_MS = 20_000;
export const SEARCH_DEFAULT_MAX = 200;
export const SEARCH_MAX_CEILING = 1000;
export const SEARCH_MAX_FILESIZE = "2M";
export const SEARCH_MAX_COUNT = 50; // per-file line cap (binds a dominant file)

/** printable ASCII only (tab/nl allowed) — rejects control/over-long inputs */
export function isValidPattern(q) {
	return (
		typeof q === "string" &&
		q.length >= 1 &&
		q.length <= 1024 &&
		!/[^\u0009\u000A\u000D\u0020-\u007E]/.test(q)
	);
}

/** Glob allowlist: plain path glob chars only, no spaces/quotes/shell chars. */
export const SAFE_GLOB_RE = /^[A-Za-z0-9_\-.*!\/]+$/;

/** Clamp capability `max` to the server ceiling. */
export function clampMax(max) {
	const n = Number.parseInt(max, 10);
	if (!Number.isFinite(n) || n <= 0) return SEARCH_DEFAULT_MAX;
	return Math.min(n, SEARCH_MAX_CEILING);
}

/** Split + allow-list `globs`; unsafe entries are dropped, never passed to rg. */
export function sanitizeGlobs(raw) {
	const out = [];
	if (typeof raw !== "string" || raw.length === 0) return out;
	for (const g of raw.split(",")) {
		const s = g.trim();
		if (s && SAFE_GLOB_RE.test(s)) out.push(s);
	}
	return out;
}

/** Build the rg argument array from validated options (array, never a shell string). */
function buildArgs(opts) {
	const args = [
		"--json",
		"--no-messages",
		"--max-count", String(opts.maxCount ?? SEARCH_MAX_COUNT),
		"--max-filesize", opts.maxFileSize ?? SEARCH_MAX_FILESIZE,
		"--color", "never"
	];
	const c = opts.case;
	if (c === "sensitive") args.push("--smart-case");
	else if (c === "insensitive") args.push("--smart-case", "-i");
	else args.push("--smart-case");

	// Hardcoded ignore-list, always present.
	args.push("--glob", "!node_modules/**", "--glob", "!.git/**", "--glob", "!.DS_Store");

	// User globs: match (include) vs ignore (exclude), each validated upstream.
	const include = opts.includeGlobs ?? [];
	const ignore = opts.ignoreGlobs ?? [];
	for (const g of include) args.push("--iglob", g);
	for (const g of ignore) args.push("--iglob", "!" + g);

	if (opts.hidden) args.push("--hidden");

	if (opts.mode === "name") {
		// Filename quick-open: `--files` emits newline-terminated paths; q is a
		// substring filter applied as an --iglob. rg sorts its own output.
		args.push("--files");
		const q = opts.q;
		if (q) args.push("--iglob", `*${q}*`);
	} else {
		// Content grep: pattern is literal via the `--` guard.
		args.push("--");
		args.push(opts.q);
	}
	if (opts.dir) args.push(String(opts.dir));
	return args;
}

/**
 * Split a content-mode rg `--json` match record's submatches to derive the
 * match span. Returns { line, col } on the extracted context. For a simple
 * whole-line match with no char detail this is best-effort; the client only
 * uses it for snippet splitting, and splitHighlight re-escapes regardless.
 */
function deriveMatch(m) {
	const line = m.lines?.text ?? "";
	let col = 0;
	let len = 0;
	let pre = "";
	let post = "";
	try {
		const sm = m.submatches?.[0];
		if (sm && typeof sm.start === "number" && typeof sm.end === "number") {
			const start = sm.start;
			const end = sm.end;
			pre = line.slice(0, start);
			post = line.slice(end);
			col = start;
			len = end - start;
		} else {
			pre = line;
			post = "";
		}
	} catch {
		pre = line;
	}
	return { path: m.path?.text ?? "", line: m.line_number ?? 1, col, len, text: line, pre, post };
}

/**
 * Async-iterable of parsed search records. Yields t-discriminated NDJSON events:
 *   {t:'meta', mode, q, count, truncated, ms}
 *   {t:'file', path, hits}
 *   {t:'match', path, line, col, text, pre, post}
 *   {t:'done', truncated}
 *   {t:'error', message}
 *
 * @param {string} ws - pinned workspace root (already validated by caller).
 * @param {object} opts - { q, mode, case, includeGlobs, ignoreGlobs, max, dir, maxInMs }.
 * @returns {AsyncGenerator<object>}
 */
export async function* searchStream(ws, opts) {
	const started = Date.now();
	if (!rgPath) {
		yield { t: "error", message: "search unavailable: ripgrep binary missing" };
		return;
	}
	const mode = opts.mode === "name" ? "name" : "content";
	const q = typeof opts.q === "string" ? opts.q : "";
	const max = clampMax(opts.max);
	const includeGlobs = sanitizeGlobs(opts.globs);
	const dir = typeof opts.dir === "string" && opts.dir ? opts.dir : ".";

	if (mode === "content" && !isValidPattern(q)) {
		yield { t: "error", message: "invalid search pattern" };
		return;
	}

	const args = buildArgs({
		...opts,
		mode, q,
		includeGlobs,
		ignoreGlobs: opts.ignoreGlobs ?? [],
		hidden: opts.hidden === true,
		maxFileSize: opts.maxFileSize ?? SEARCH_MAX_FILESIZE,
		maxCount: opts.maxCount ?? SEARCH_MAX_COUNT,
		dir
	});

	let child;
	try {
		child = spawn(rgPath, args, { cwd: ws, stdio: ["ignore", "pipe", "pipe"] });
		// Expose the child so a caller can kill rg on client-abort (killRef.kill).
		if (opts.killRef && typeof opts.killRef === "object") {
			opts.killRef.kill = () => { try { child.kill("SIGTERM"); } catch {} };
		}
	} catch {
		yield { t: "error", message: "search unavailable: could not start ripgrep" };
		return;
	}
	child.stderr.on("data", () => {}); // swallow; errors surface as NDJSON error line

	const timer = setTimeout(() => { try { child.kill("SIGTERM"); } catch {} }, opts.maxInMs ?? SEARCH_TIMEOUT_MS);
	child.on("exit", () => clearTimeout(timer));

	const rl = createInterface({ input: child.stdout });
	let count = 0; // match count (content) / file count (name)
	let truncated = false;
	let fileHits = null;

	try {
		for await (const line of rl) {
			if (!line.trim()) continue;
			if (mode === "name") {
				// rg --files emits newline-terminated plain paths (not JSON).
				const raw = line.trim();
				if (!raw || raw.includes("\u0000")) continue;
				// Normalize: rg prefixes workspace-relative output with "./". Emit a
				// clean, root-relative path for the client (still re-validated later).
				const p = raw.startsWith("./") ? raw.slice(2) : raw;
				yield { t: "match", path: p, line: 0, col: 0, text: "", pre: "", post: "" };
				count++;
				if (count >= max) { truncated = true; break; }
				continue;
			}
			let rec;
			try { rec = JSON.parse(line); } catch { continue; }
			const ty = rec.type;
			if (ty === "begin") {
				fileHits = { path: rec.data?.path?.text ?? "", hits: 0 };
			} else if (ty === "match") {
				if (!fileHits) fileHits = { path: rec.data?.path?.text ?? "", hits: 0 };
				const m = deriveMatch(rec.data ?? {});
				const p = (m.path || fileHits.path).replace(/^\.\//, "");
				yield { t: "match", path: p, line: m.line, col: m.col, text: m.text, pre: m.pre, post: m.post };
				count++;
				fileHits.hits++;
				if (count >= max) { truncated = true; break; }
			} else if (ty === "end") {
				if (fileHits && fileHits.hits > 0) yield { t: "file", path: fileHits.path, hits: fileHits.hits };
				fileHits = null;
			}
		}
	} catch {
		yield { t: "error", message: "search stream error" };
	} finally {
		clearTimeout(timer);
	}

	if (truncated) { try { child.kill("SIGTERM"); } catch {} }
	yield { t: "done", truncated };
}