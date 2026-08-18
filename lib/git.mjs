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
