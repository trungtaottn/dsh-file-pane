/**
 * Git history/blame/commit route contract tests (plan 4, Phase 2).
 *
 * Boots the plugin handler against the real repo (ROOT is a git repo), then
 * exercises /browser/api/git/log|commit|blame and the ?gitview=commit render
 * branch, plus the gated POST commit (403 when write is disabled).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { apply } = await import("../lib/index.js");

function makeHandler(config = {}) {
	let reg;
	const ctx = { webServer: { register: (x) => (reg = x) }, logger: { info() {} } };
	apply(ctx, { workspaceRoot: ROOT, ...config });
	return reg.handler;
}

async function request(handler, url, method = "GET", body) {
	const r = { code: null, type: null, body: "" };
	const res = {
		writeHead(c, h) { r.code = c; r.type = h?.["content-type"]; },
		write(chunk) { if (typeof chunk === "string") r.body += chunk; },
		end(b) { r.body += b !== undefined ? String(b) : ""; }
	};
	const req = { method, url, on: () => {} };
	if (body) { req.body = JSON.stringify(body); req.headers = { "content-type": "application/json" }; }
	await handler(req, res);
	return r;
}

const W = encodeURIComponent(ROOT);

test("GET /browser/api/git/log returns oneline entries", async () => {
	const h = makeHandler();
	const r = await request(h, `/browser/api/git/log?workspace=${W}&limit=5`);
	assert.equal(r.code, 200);
	assert.match(r.type, /json/);
	const d = JSON.parse(r.body);
	assert.equal(d.ok, true);
	assert.equal(d.git, true);
	assert.ok(Array.isArray(d.entries) && d.entries.length >= 1);
	assert.ok(/^[0-9a-f]{7,64}$/.test(d.entries[0].sha));
});

test("GET /browser/api/git/commit returns meta + aligned diff; 400 on bad rev", async () => {
	const h = makeHandler();
	const log = await request(h, `/browser/api/git/log?workspace=${W}&limit=1`);
	const sha = JSON.parse(log.body).entries[0].sha;
	const r = await request(h, `/browser/api/git/commit?workspace=${W}&sha=${sha}&path=lib/git.mjs`);
	assert.equal(r.code, 200);
	const d = JSON.parse(r.body);
	assert.ok(d.meta && d.meta.subject, "commit meta present");
	assert.ok(Array.isArray(d.aligned.rows), "aligned rows present");
	assert.equal(typeof d.added, "number");
	// bad rev (non-hex) → 400 before git
	const bad = await request(h, `/browser/api/git/commit?workspace=${W}&sha=HEAD&path=lib/git.mjs`);
	assert.equal(bad.code, 400);
});

test("GET /browser/api/git/blame returns capped entries", async () => {
	const h = makeHandler();
	const r = await request(h, `/browser/api/git/blame?workspace=${W}&path=lib/git.mjs`);
	assert.equal(r.code, 200);
	const d = JSON.parse(r.body);
	assert.equal(d.ok, true);
	assert.equal(typeof d.capped, "boolean");
	assert.ok(Array.isArray(d.entries) && d.entries.length >= 1);
	assert.ok(/^[0-9a-f]{40}$/.test(d.entries[0].sha));
});

test("?gitview=commit renders a commit/diff HTML page", async () => {
	const h = makeHandler();
	const log = await request(h, `/browser/api/git/log?workspace=${W}&limit=1`);
	const sha = JSON.parse(log.body).entries[0].sha;
	const r = await request(h, `/browser/?path=lib/git.mjs&gitview=commit&sha=${sha}&workspace=${W}&embed=1`);
	assert.equal(r.code, 200);
	assert.match(r.type, /html/);
	assert.ok(r.body.includes("commithdr"), "commit header present");
	assert.ok(r.body.includes("dview"), "diff view present");
});

test("?blame=1 renders the blame gutter in the file view", async () => {
	const h = makeHandler();
	const r = await request(h, `/browser/?path=lib/git.mjs&blame=1&workspace=${W}&embed=1`);
	assert.equal(r.code, 200);
	assert.ok(r.body.includes("has-blame"), "blame grid class present");
	assert.ok(r.body.includes('class="blame"'), "blame annotation cells present");
});

test("POST /browser/api/git/commit is 403 when gitWriteEnabled is false (default)", async () => {
	const h = makeHandler(); // default → write disabled
	const r = await request(h, `/browser/api/git/commit?workspace=${W}`, "POST", { message: "x" });
	assert.equal(r.code, 403);
});

test("branch/status responses expose write flag", async () => {
	const h = makeHandler();
	const r = await request(h, `/browser/api/git/branch?workspace=${W}`);
	assert.equal(r.code, 200);
	assert.equal(JSON.parse(r.body).write, false);
	const r2 = await request(h, `/browser/api/git/status?workspace=${W}`);
	assert.equal(JSON.parse(r2.body).write, false);
});