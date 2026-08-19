/**
 * Windowing + meta contract tests (Phase 3).
 *
 * contentLines slicing with absolute data-ln, ?meta=1 shape, data-large gate,
 * and route-level meta/window handling through the plugin handler.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { contentLines } from "../lib/view-core.mjs";
import { renderTextRows, paneFileHTML } from "../lib/view-html.mjs";

const { apply } = await import("../lib/index.js");

function makeHandler(root, config = {}) {
	let reg;
	const ctx = { webServer: { register: (x) => (reg = x), registerUpgrade: () => () => {} }, logger: { info() {} }, effect: (cb) => { const d = typeof cb === "function" ? cb() : undefined; if (typeof d === "function") { try { d(); } catch {} } return () => {}; } };
	apply(ctx, { workspaceRoot: root, ...config });
	return reg.handler;
}

async function request(handler, url, method = "GET") {
	const r = { code: null, type: null, body: "", buf: null };
	const res = {
		writeHead(c, h) { r.code = c; r.type = h?.["content-type"]; },
		write(chunk) { if (typeof chunk === "string") r.body += chunk; },
		end(b) { if (Buffer.isBuffer(b)) { r.buf = b; r.body = b.toString("utf8"); } else { r.body = String(b); } }
	};
	await handler({ method, url, on: () => {} }, res);
	return r;
}

test("contentLines slicing + window boundaries", async () => {
	const file = Array.from({ length: 2500 }, (_, i) => `line ${i}`);
	const slice = file.slice(1000, 2000);
	assert.equal(slice.length, 1000);
	assert.equal(slice[0], "line 1000");
	const html = await renderTextRows(slice, "big.txt", { start: 1000 });
	assert.ok(html.includes('data-ln="1001"'), "absolute line numbering starts at 1001");
	assert.ok(!html.includes('data-ln="1"'), "no relative line numbers leak");
	assert.ok(!html.includes('data-ln="2001"'), "window 1 boundary not included");
});

test("?meta=1 returns { totalLines, size, mime, ext } for a text file", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-meta-"));
	const src = Array.from({ length: 500 }, (_, i) => `line ${i}`).join("\n");
	await fs.writeFile(path.join(dir, "big.js"), src);
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=big.js&meta=1");
	assert.equal(r.code, 200);
	assert.match(r.type, /json/);
	const meta = JSON.parse(r.body);
	assert.equal(meta.totalLines, 500);
	assert.equal(meta.size, src.length);
	assert.equal(meta.mime, "text/javascript; charset=utf-8");
});

test("?window=N&lines=1000 renders the bounded slice with absolute data-ln", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-win-"));
	await fs.writeFile(path.join(dir, "big.js"), Array.from({ length: 2500 }, (_, i) => `line ${i}`).join("\n"));
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=big.js&window=1&lines=1000");
	assert.equal(r.code, 200);
	assert.match(r.type, /html/);
	assert.ok(r.body.includes('data-ln="1001"'), "window 1 starts at absolute 1001");
	assert.ok(r.body.includes('data-ln="2000"'), "window 1 ends at 2000");
	assert.ok(!r.body.includes('data-ln="1"'), "window 1 has no line 1");
});

test("data-large is set for files at/over windowingThreshold; off below", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-large-"));
	await fs.writeFile(path.join(dir, "small.js"), "a\nb\nc\n");
	await fs.writeFile(path.join(dir, "big.js"), Array.from({ length: 120000 }, (_, i) => `l${i}`).join("\n"));
	const h = makeHandler(dir, { windowingThreshold: 100000 });
	const small = await request(h, "/browser/?path=small.js");
	assert.ok(!/<body[^>]*data-large/.test(small.body), "small file body not marked large");
	const big = await request(h, "/browser/?path=big.js");
	assert.ok(/<body[^>]*data-large/.test(big.body), "big file body marked data-large");
});

test("windowingThreshold:0 forces data-large on every text file", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-large0-"));
	await fs.writeFile(path.join(dir, "tiny.js"), "x\n");
	const h = makeHandler(dir, { windowingThreshold: 0 });
	const r = await request(h, "/browser/?path=tiny.js");
	assert.ok(/<body[^>]*data-large/.test(r.body), "threshold 0 marks even tiny files");
});

test("paneFileHTML content-visibility CSS present when data-large", async () => {
	const html = await paneFileHTML({ path: "a.js", kind: "text", mime: "text/javascript", size: 10, text: "x\ny\n" }, true, { settings: {}, dataLarge: true });
	assert.ok(html.includes("content-visibility:auto"), "content-visibility fallback CSS emitted");
	assert.ok(/<body[^>]*data-large/.test(html), "body carries data-large");
});