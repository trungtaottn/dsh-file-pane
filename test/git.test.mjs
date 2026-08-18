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
