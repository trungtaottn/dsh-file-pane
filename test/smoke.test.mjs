import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

const { apply } = await import("../lib/index.js");

function makeHandler(root) {
	let reg;
	const ctx = { webServer: { register: (x) => (reg = x), registerUpgrade: () => () => {} }, logger: { info() {} }, effect: (cb) => { const d = typeof cb === "function" ? cb() : undefined; if (typeof d === "function") { try { d(); } catch {} } return () => {}; } };
	apply(ctx, { workspaceRoot: root });
	return reg.handler;
}

async function request(handler, url) {
	const r = { code: null, type: null, body: "", buf: null };
	const res = {
		writeHead(c, h) { r.code = c; r.type = h?.["content-type"]; },
		end(b) { if (Buffer.isBuffer(b)) { r.buf = b; r.body = b.toString("utf8"); } else { r.body = String(b); } }
	};
	await handler({ url }, res);
	return r;
}

test("root listing returns HTML pane", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-"));
	await fs.writeFile(path.join(dir, "a.md"), "# hi");
	const h = makeHandler(dir);
	const r = await request(h, "/browser/");
	assert.equal(r.code, 200);
	assert.match(r.type, /html/);
	assert.ok(r.body.includes("a.md"));
});

test("file pane renders markdown", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-"));
	await fs.writeFile(path.join(dir, "a.md"), "# title\nbody");
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=a.md");
	assert.equal(r.code, 200);
	assert.match(r.type, /html/);
	assert.ok(r.body.includes("dsh-file-pane") || r.body.includes("a.md"));
});

test("raw returns exact bytes with text mime", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-"));
	await fs.writeFile(path.join(dir, "a.md"), "plain text");
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=a.md&raw=1");
	assert.equal(r.code, 200);
	assert.match(r.type, /markdown/);
	assert.equal(r.body, "plain text");
});

test("path traversal is blocked (403)", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-"));
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=" + encodeURIComponent("../../../etc/passwd"));
	assert.equal(r.code, 403);
});

test("missing file returns 404", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-"));
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=nope.txt&raw=1");
	assert.equal(r.code, 404);
});

test("symlink escaping root is blocked (403)", async () => {
	const root = await fs.mkdtemp(path.join(tmpdir(), "pane-"));
	const dead = await fs.mkdtemp(path.join(tmpdir(), "pane-out-"));
	const secret = path.join(dead, "secret.txt");
	await fs.writeFile(secret, "s3cr3t");
	try { await fs.symlink(secret, path.join(root, "link.txt")); } catch { return; } // skip on platforms without symlink
	const h = makeHandler(root);
	const r = await request(h, "/browser/?path=link.txt&raw=1");
	assert.equal(r.code, 403);
});
