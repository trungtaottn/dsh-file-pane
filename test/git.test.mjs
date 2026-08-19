/**
 * Git module contract tests.
 *
 * isValidBranch is the single gate before any branch name reaches `git
 * checkout` — it must never let a shell/flag-injection or ref-escape through.
 * These are pure security checks; the live git calls are exercised against the
 * real repo by the server tests (smoke) and manual verification.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidBranch, isGitRepo, currentBranch, listBranches } from "../lib/git.mjs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("isValidBranch accepts plain ref-safe names", () => {
	assert.equal(isValidBranch("main"), true);
	assert.equal(isValidBranch("feat/git-workspace-pane"), true);
	assert.equal(isValidBranch("feature-v2.0/fix"), true);
	assert.equal(isValidBranch("dsh-file-pane"), true);
});

test("isValidBranch rejects injection / ref-escape input", () => {
	const bad = [
		"-flag",            // flag injection
		"--work-tree=/x",   // long-option injection
		"..",               // traversal
		"a..b",
		"; rm -rf /",
		"$(id)",
		"`id`",
		"a b",              // whitespace
		"a\tb",
		"a@{b}",            // reflog
		"/leading",
		"trailing/",
		"trailing.",
		"",
		"  ",
		"a\nb"
	];
	for (const b of bad) assert.equal(isValidBranch(b), false, `expected reject: ${JSON.stringify(b)}`);
	assert.equal(isValidBranch(123), false);
	assert.equal(isValidBranch(null), false);
	assert.equal(isValidBranch(undefined), false);
});

test("git module reads the real repo at the workspace", async () => {
	assert.equal(await isGitRepo(ROOT), true);
	const cur = await currentBranch(ROOT);
	assert.ok(typeof cur === "string" && cur.length > 0, "current branch resolves");
	const branches = await listBranches(ROOT);
	assert.ok(Array.isArray(branches) && branches.includes(cur), "current branch present in list");
});

import { isText, mimeFor, isLikelyText } from "../lib/view-core.mjs";

test("isText recognizes json / xml / javascript as text", () => {
	assert.equal(isText("application/json; charset=utf-8"), true);
	assert.equal(isText("application/xml; charset=utf-8"), true);
	assert.equal(isText("application/javascript; charset=utf-8"), true);
	assert.equal(isText("text/markdown; charset=utf-8"), true);
	assert.equal(isText("application/octet-stream"), false);
});

test("mimeFor maps extensionless text files (LICENSE, Makefile) to text/plain", () => {
	assert.equal(mimeFor("LICENSE"), "text/plain; charset=utf-8");
	assert.equal(mimeFor("Makefile"), "text/plain; charset=utf-8");
	assert.equal(mimeFor("dockerfile"), "text/plain; charset=utf-8");
	assert.equal(mimeFor("package.json"), "application/json; charset=utf-8");
});

test("isLikelyText sniffs UTF-8 text vs binary", () => {
	assert.equal(isLikelyText(Buffer.from("hello world\nMIT License\n", "utf8")), true);
	assert.equal(isLikelyText(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])), false); // PNG magic (has NUL? no, but invalid utf8)
	assert.equal(isLikelyText(Buffer.from([0x00, 0x41, 0x00, 0x42])), false); // NUL bytes (UTF-16)
	assert.equal(isLikelyText(Buffer.from("Đây là file tiếng việt\n", "utf8")), true);
});

import { isValidRev, isValidGitRef, logHistory, commitMeta, blobAt, blameLines, blameForWorkspace, isDirty, commit, blameCacheSize } from "../lib/git.mjs";

const SHA_FULL = "a".repeat(40);
const SHA_SHORT = "abcdef1";

test("isValidRev accepts full/short hex, rejects researched bad-rev forms", () => {
	for (const ok of [SHA_FULL, SHA_SHORT, "0123456789abcdef", "f".repeat(64)]) {
		assert.equal(isValidRev(ok), true, `accept ${ok.slice(0, 12)}`);
	}
	for (const bad of ["-HEAD", "--work-tree=/x", "HEAD^", "HEAD~1", "main..HEAD", "HEAD@{1}", "a b", "a\nb", "$(id)", "`x`", "';rm'", "refs/../../etc", "a:b", "HEAD", "main", "abc", "xyz1234", "", null, undefined, 123]) {
		assert.equal(isValidRev(bad), false, `reject ${JSON.stringify(bad)}`);
	}
});

test("isValidGitRef accepts a branch AND a rev", () => {
	assert.equal(isValidGitRef("feat/git-workspace-pane"), true);
	assert.equal(isValidGitRef(SHA_SHORT), true);
	assert.equal(isValidGitRef("--work-tree=/x"), false);
	assert.equal(isValidGitRef("main..HEAD"), false);
	assert.equal(isValidGitRef("$(id)"), false);
});

test("logHistory returns oneline entries and clamps limit", async () => {
	const entries = await logHistory(ROOT, { limit: 5 });
	assert.ok(entries.length >= 1 && entries.length <= 5);
	for (const e of entries.slice(0, 3)) {
		assert.ok(/^[0-9a-f]{7,64}$/.test(e.sha), "full sha hex");
		assert.ok(/^[0-9a-f]{7}$/.test(e.short), "short sha 7-hex");
		assert.ok(typeof e.subject === "string" && e.subject.length > 0, "subject present");
		assert.ok(typeof e.author === "string", "author present");
	}
	// limit clamps: 0 → default 100; huge → 500
	const def = await logHistory(ROOT, { limit: 0 });
	assert.equal(def.length <= 100, true);
	const big = await logHistory(ROOT, { limit: 9999 });
	assert.ok(big.length <= 500, "clamped to 500");
});

test("commitMeta resolves metadata for the HEAD sha", async () => {
	const entries = await logHistory(ROOT, { limit: 1 });
	const meta = await commitMeta(ROOT, entries[0].sha);
	assert.ok(meta && meta.sha && meta.author && meta.subject, "meta fields populated");
});

test("blobAt reads the commit-side blob (not the worktree)", async () => {
	const blob = await blobAt(ROOT, "HEAD", "lib/git.mjs");
	assert.ok(typeof blob === "string" && blob.length > 100, "blob is non-empty source");
	await assert.rejects(() => blobAt(ROOT, "HEAD", "-flag"), /invalid/);
	await assert.rejects(() => blobAt(ROOT, "HEAD\n", "x"), /invalid/);
	await assert.rejects(() => blobAt(ROOT, "HEAD", ""), /invalid/);
});

test("blameLines returns capped + per-line attribution, honoring maxLines", async () => {
	const { capped, lines } = await blameLines(ROOT, "lib/git.mjs", { maxLines: 2 });
	assert.equal(capped, true);
	assert.equal(lines.length, 2);
	for (const l of lines) {
		assert.ok(/^[0-9a-f]{40}$/.test(l.sha), "sha 40-hex");
		assert.ok(typeof l.text === "string" && l.text.length > 0, "source line text");
	}
});

test("blameForWorkspace is LRU-cached by (realpath,size,mtimeMs)", async () => {
	const real = resolve(ROOT, "lib/git.mjs");
	const st = await fs.stat(real);
	const first = await blameForWorkspace(ROOT, real, "lib/git.mjs", { maxLines: 3 });
	assert.equal(first.cached, false);
	assert.ok(first.lines.length >= 1);
	const second = await blameForWorkspace(ROOT, real, "lib/git.mjs", { maxLines: 3 });
	assert.equal(second.cached, true, "same stat identity → cache hit");
});

test("commit refuses dirty tree, empty/oversize/NUL messages", async () => {
	const dirty = await isDirty(ROOT);
	const empty = await commit(ROOT, "");
	assert.equal(empty.ok, false, "empty message refused");
	assert.match(empty.error, /1\.\.10000/);
	const nul = await commit(ROOT, "x\u0000y");
	assert.equal(nul.ok, false);
	assert.match(nul.error, /NUL/);
	const big = await commit(ROOT, "x".repeat(10001));
	assert.equal(big.ok, false);
	assert.match(big.error, /1\.\.10000/);
	if (dirty) {
		const r = await commit(ROOT, "should not commit");
		assert.equal(r.ok, false);
		assert.match(r.error, /uncommitted changes|dirty|working tree/);
	}
});
