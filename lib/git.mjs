/**
 * dsh-file-pane / git
 *
 * Minimal, read-mostly git façade scoped to a workspace directory. Used by the
 * dock's source-control pane to expose the working branch, the branch list and
 * the dirty-file set, plus an optional, carefully-guarded `git checkout`.
 *
 * Security contract (kept deliberately small):
 *   - Every command runs with `cwd` set to a workspace directory that the
 *     caller has already pinned inside the configured root (never `$HOME` at
 *     large, never user-supplied free-form).
 *   - Branch names are validated against a strict ref-ish allowlist before ever
 *     reaching git; they are passed as an array argument to execFile (never
 *     through a shell), so no flag injection / shell metacharacters.
 *   - Timeouts bound every call; maxBuffer bounds output.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const GIT_TIMEOUT = 10000;
const MAX_OUT = 4 * 1024 * 1024;

/** Match a plausible local branch name: ref-safe, no spaces/control/glob-ish. */
const BRANCH_RE = /^[A-Za-z0-9._/+-]+$/;

/** Reject anything that is not a safe, non-magic branch name. */
export function isValidBranch(name) {
	return (
		typeof name === "string" &&
		name.length > 0 &&
		name.length <= 200 &&
		BRANCH_RE.test(name) &&
		!name.startsWith("-") &&
		!name.includes("..") &&
		!name.startsWith("/") &&
		!name.endsWith("/") &&
		!name.endsWith(".") &&
		!name.includes("@{")
	);
}

/** Returns false when `dir` is not a git work tree. */
export async function isGitRepo(dir) {
	try {
		await execFileP("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dir, timeout: GIT_TIMEOUT, maxBuffer: 1024 * 1024 });
		return true;
	} catch { return false; }
}

/** Current branch name (or "HEAD" when detached). Returns null on error/non-git. */
export async function currentBranch(dir) {
	try {
		const { stdout } = await execFileP("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: dir, timeout: GIT_TIMEOUT, maxBuffer: 1024 * 1024 });
		const name = stdout.trim();
		return name === "HEAD" ? null : name;
	} catch { return null; }
}

/** List local branch names (refs/heads), current first. */
export async function listBranches(dir) {
	try {
		const { stdout } = await execFileP("git", ["for-each-ref", "--format=%(refname:short)", "refs/heads"], { cwd: dir, timeout: GIT_TIMEOUT, maxBuffer: MAX_OUT });
		const heads = stdout.split("\n").map((s) => s.trim()).filter(Boolean);
		const cur = await currentBranch(dir);
		// sort: current first, then alphabetical
		const sortVal = (b) => (b === cur ? "\u0000" : b);
		return heads.sort((a, b) => sortVal(a) < sortVal(b) ? -1 : sortVal(a) > sortVal(b) ? 1 : 0);
	} catch { return []; }
}

/**
 * Dirty file set vs HEAD (`git status --porcelain`).
 * Returns [{ path, status, staged }]; `status` is a single letter among
 * A/M/D/R/C/U/? and staged=true when the index differs. Empty on clean/non-git.
 */
export async function listChanges(dir) {
	try {
		const { stdout } = await execFileP(
			"git", ["status", "--porcelain=v1", "--untracked-files=normal"],
			{ cwd: dir, timeout: GIT_TIMEOUT, maxBuffer: MAX_OUT }
		);
		const out = [];
		for (const line of stdout.split("\n")) {
			if (!line) continue;
			if (line.length < 3) continue;
			const x = line[0];
			const y = line[1];
			let path = line.slice(3).trim();
			// Renames/copies render as `R  old -> new`; keep the destination.
			const arrow = path.indexOf(" -> ");
			if (arrow !== -1) path = path.slice(arrow + 4).trim();
			// Unquote C-style quoted paths (spaces, unicode) if git quoted them.
			if (path.startsWith("\"") && path.endsWith("\"")) {
				try { path = JSON.parse(path.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))); } catch { /* keep raw */ }
			}
			if (!path) continue;
			const untracked = x === "?" && y === "?";
			const status = untracked ? "?" : y !== " " ? y : x;
			out.push({ path, status, staged: !untracked && x !== " " && x !== "?" });
		}
		return out;
	} catch { return []; }
}

/**
 * Switch to a local branch. Returns { ok, error?, current }. Read-validates
 * the branch name before running git; wraps non-zero exit into { ok:false }.
 */
export async function checkoutBranch(dir, branch) {
	if (!isValidBranch(branch)) return { ok: false, error: "invalid branch name", current: await currentBranch(dir) };
	try {
		await execFileP("git", ["checkout", branch], { cwd: dir, timeout: GIT_TIMEOUT, maxBuffer: MAX_OUT });
		return { ok: true, current: branch };
	} catch (e) {
		return { ok: false, error: stripGitError(e), current: await currentBranch(dir) };
	}
}

function stripGitError(e) {
	const msg = e?.stderr || e?.stdout || e?.message || "git failed";
	return String(msg).split("\n").filter(Boolean).slice(-3).join(" · ").slice(0, 400);
}

/* ── History / blame / gated commit façades (read-mostly; commit is opt-in) ── */

/** Full or short hex SHA (7..64). */
const SHA_RE = /^[0-9a-f]{7,64}$/;

export function isValidRev(s) {
	return typeof s === "string" && SHA_RE.test(s);
}

/** A ref is a validated branch name OR a hex rev (the only two ref sources we accept). */
export function isValidGitRef(s) {
	return isValidBranch(s) || isValidRev(s);
}

const LOG_FMT = "%x1e%H%x1f%h%x1f%an%x1f%ad%x1f%s%x1e";

/**
 * Commit history (oneline list, newest first). limit clamped 1..500 (default 100).
 * Returns [] on non-git / error (mirrors existing façades).
 */
export async function logHistory(dir, { limit = 100 } = {}) {
	const n = Number.isInteger(limit) && limit >= 1 && limit <= 500 ? limit : 100;
	try {
		const { stdout } = await execFileP(
			"git", ["log", `--format=${LOG_FMT}`, "--date=iso-strict", "--topo-order", `-${n}`],
			{ cwd: dir, timeout: GIT_TIMEOUT, maxBuffer: MAX_OUT }
		);
		const out = [];
		for (const rec of stdout.split("\x1e")) {
			if (!rec) continue;
			const [full, short, author, date, ...rest] = rec.split("\x1f");
			if (!full || !short) continue;
			out.push({ sha: full, short, author, date, subject: rest.join("\x1f") || "" });
		}
		return out;
	} catch { return []; }
}

/** Commit metadata for a validated sha (git show --no-patch). Returns null on error. */
export async function commitMeta(dir, sha) {
	if (!isValidRev(sha)) return null;
	try {
		const { stdout } = await execFileP(
			"git", ["show", `--format=%H%n%an%n%ad%n%s%n%b`, "--date=iso-strict", "--no-patch", sha],
			{ cwd: dir, timeout: GIT_TIMEOUT, maxBuffer: MAX_OUT }
		);
		const [full, author, date, subject, ...bodyLines] = stdout.split("\n");
		return { sha: full, author, date, subject, body: bodyLines.join("\n").trim() };
	} catch { return null; }
}

/**
 * Read a file blob at `rev:relPath` (commit side — deliberately NOT
 * readFileResult, which reads the live worktree). rev validated; relPath must
 * not contain `\n` or start with `-` (no flag injection / path break).
 */
export async function blobAt(dir, rev, relPath) {
	if (!isValidGitRef(rev) || typeof relPath !== "string" || relPath.length === 0) throw new Error("invalid rev/path");
	if (relPath.includes("\n") || relPath.startsWith("-")) throw new Error("invalid path");
	const { stdout } = await execFileP("git", ["show", `${rev}:${relPath}`], { cwd: dir, timeout: GIT_TIMEOUT, maxBuffer: MAX_OUT });
	return stdout;
}

/**
 * Per-line blame via `git blame --line-porcelain` stateful parse.
 * Returns { capped, lines:[{sha,author,ts,tz,summary,text}] }; `capped` true
 * when the file exceeds maxLines (server-side bound for hostile clients).
 */
export async function blameLines(dir, relPath, { maxLines = 1500 } = {}) {
	try {
		const { stdout } = await execFileP(
			"git", ["blame", "--line-porcelain", "--", relPath],
			{ cwd: dir, timeout: GIT_TIMEOUT, maxBuffer: MAX_OUT }
		);
		const lines = [];
		let sha = null, author = "", ts = 0, tz = "", summary = "";
		for (const raw of stdout.split("\n")) {
			if (raw.startsWith("\t")) {
				lines.push({ sha, author, ts, tz, summary, text: raw.slice(1) });
				continue;
			}
			const sp = raw.indexOf(" ");
			const key = sp === -1 ? raw : raw.slice(0, sp);
			const val = sp === -1 ? "" : raw.slice(sp + 1);
			if (/^[0-9a-f]{40}$/.test(key)) sha = key;
			else if (key === "author") author = val;
			else if (key === "author-time") ts = Number.parseInt(val, 10) || 0;
			else if (key === "author-tz") tz = val;
			else if (key === "summary") summary = val;
		}
		const capped = lines.length > maxLines;
		return { capped, lines: capped ? lines.slice(0, maxLines) : lines };
	} catch { return { capped: false, lines: [] }; }
}

/** True when `git status --porcelain` shows any change. */
export async function isDirty(dir) {
	return (await listChanges(dir)).length > 0;
}

const COMMIT_MSG_MAX = 10000;

/**
 * Local `git commit -m <message>` — the ONLY write surface, and only with a
 * single array-element message (no extra flags). Refuses a dirty worktree and
 * empty/oversize/NUL messages. Returns { ok, out|error }.
 */
export async function commit(dir, message) {
	if (typeof message !== "string") return { ok: false, error: "invalid message" };
	if (message.length === 0 || message.length > COMMIT_MSG_MAX) return { ok: false, error: "message must be 1..10000 chars" };
	if (message.includes("\u0000")) return { ok: false, error: "message contains NUL" };
	if (await isDirty(dir)) return { ok: false, error: "working tree has uncommitted changes — commit refused" };
	try {
		const { stdout } = await execFileP("git", ["commit", "-m", message], { cwd: dir, timeout: GIT_TIMEOUT, maxBuffer: MAX_OUT });
		return { ok: true, out: stripGitError({ stdout }) || "committed" };
	} catch (e) {
		return { ok: false, error: stripGitError(e) };
	}
}

/* ── Blame cache (bounded LRU, keyed by realpath — no cross-workspace poisoning) ── */

const BLAME_CACHE_MAX = 200;
const blameCache = new Map(); // key(realpath,size,mtimeMs) -> { capped, lines }

function blameKey(realPath, size, mtimeMs) {
	return `${realPath}\u0000${size}\u0000${mtimeMs}`;
}

/**
 * Blame for a workspace file, LRU-cached by (realpath, size, mtimeMs). The
 * caller (route) resolves realpath + stat before calling, so keys can never
 * cross workspaces. Returns { capped, lines, cached }.
 */
export async function blameForWorkspace(dir, realPath, relPath, { maxLines = 1500 } = {}) {
	let st;
	try { st = await import("node:fs/promises").then((m) => m.stat(realPath)); } catch { st = null; }
	const key = blameKey(realPath, st?.size ?? 0, st?.mtimeMs ?? 0);
	const hit = blameCache.get(key);
	if (hit) { blameCache.delete(key); blameCache.set(key, hit); return { ...hit, cached: true }; }
	const fresh = await blameLines(dir, relPath, { maxLines });
	const entry = { capped: fresh.capped, lines: fresh.lines };
	blameCache.set(key, entry);
	if (blameCache.size > BLAME_CACHE_MAX) blameCache.delete(blameCache.keys().next().value);
	return { ...entry, cached: false };
}

/** Blame cache size (tests). */
export function blameCacheSize() { return blameCache.size; }
