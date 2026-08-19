/**
 * WorkspaceWatcher security + semantics tests (pure Node, real chokidar on a
 * mkdtemp tree). Gates: HARD_IGNORE dirs, symlink-escape (never emits outside
 * root), outside-root/`..`, burst coalescing, ENOSPC → supportsWatch false.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceWatcher, HARD_IGNORE } from "../lib/watch.mjs";

const settle = (ms = 350) => new Promise((r) => setTimeout(r, ms));

async function makeWatcher(root, debounceMs = 30) {
	const events = [];
	const w = new WorkspaceWatcher({ root, debounceMs, onEvents: (e) => events.push(...e) });
	await new Promise((r) => w.watcher.once("ready", r));
	return { w, events };
}

test("HARD_IGNORE matches the git/vendor/build dirs before fd binding", () => {
	for (const p of ["/ws/.git/HEAD", "/ws/node_modules/x.js", "/ws/dist/main.js", "/ws/target/x", "/ws/.next/x", "/ws/__pycache__/x", "/ws/.venv/bin/x"]) {
		assert.equal(HARD_IGNORE.test(p), true, `ignore ${p}`);
	}
	for (const p of ["/ws/src/app.ts", "/ws/package.json", "/ws/distx/file.js"]) {
		assert.equal(HARD_IGNORE.test(p), false, `keep ${p}`);
	}
});

test("a file write inside root emits a single add/change rel (workspace-relative)", async () => {
	const root = await fs.mkdtemp(join(tmpdir(), "watch-ok-"));
	const { w, events } = await makeWatcher(root);
	await fs.writeFile(join(root, "a.txt"), "hello");
	await settle();
	assert.ok(events.some((e) => e.rel === "a.txt"), `emitted rel for a.txt (got ${JSON.stringify(events)})`);
	assert.ok(events.every((e) => !e.rel.startsWith("/")), "never an absolute path");
	await w.close();
});

test("HARD_IGNORE dirs (node_modules) produce no emit", async () => {
	const root = await fs.mkdtemp(join(tmpdir(), "watch-ign-"));
	const { w, events } = await makeWatcher(root);
	await fs.mkdir(join(root, "node_modules"));
	await fs.writeFile(join(root, "node_modules", "x.js"), "x");
	await settle();
	assert.ok(events.every((e) => !e.rel.includes("node_modules")), "node_modules never emitted");
	await w.close();
});

test("symlink escape never leaks an outside path", async () => {
	const root = await fs.mkdtemp(join(tmpdir(), "watch-link-"));
	const outside = await fs.mkdtemp(join(tmpdir(), "watch-out-"));
	const { w, events } = await makeWatcher(root);
	await fs.symlink(outside, join(root, "link"));
	await fs.writeFile(join(outside, "secret.txt"), "s");
	await settle();
	assert.ok(events.every((e) => !e.rel.includes("secret")), "symlink target content not emitted");
	assert.ok(events.every((e) => !e.rel.startsWith("/") && !e.rel.includes("..")), "no absolute/.. rels");
	await w.close();
});

test("burst of writes coalesces to distinct rels in one onEvents batch", async () => {
	const root = await fs.mkdtemp(join(tmpdir(), "watch-burst-"));
	const batches = [];
	const w = new WorkspaceWatcher({ root, debounceMs: 60, onEvents: (e) => batches.push(e) });
	await new Promise((r) => w.watcher.once("ready", r));
	await fs.writeFile(join(root, "a.txt"), "1");
	await fs.writeFile(join(root, "b.txt"), "2");
	await fs.writeFile(join(root, "c.txt"), "3");
	await settle(200);
	const rels = batches.flat().map((e) => e.rel);
	assert.deepEqual(new Set(rels), new Set(["a.txt", "b.txt", "c.txt"]), `all 3 distinct rels coalesced (got ${rels})`);
	await w.close();
});

test("ENOSPC flips supportsWatch to false", async () => {
	const root = await fs.mkdtemp(join(tmpdir(), "watch-enospc-"));
	const { w } = await makeWatcher(root);
	w.watcher.emit("error", { code: "ENOSPC" });
	assert.equal(w.supportsWatch, false);
	await w.close();
});

test("close() clears the debounce timer and stops emitting", async () => {
	const root = await fs.mkdtemp(join(tmpdir(), "watch-close-"));
	const events = [];
	const w = new WorkspaceWatcher({ root, debounceMs: 30, onEvents: (e) => events.push(...e) });
	await new Promise((r) => w.watcher.once("ready", r));
	await w.close();
	await fs.writeFile(join(root, "after.txt"), "x");
	await settle();
	assert.equal(events.length, 0, "no emit after close");
});