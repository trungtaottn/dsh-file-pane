import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { diffSides, contentLines, renderMarkdown, escapeHtml } from "../lib/view-core.mjs";
import { paneDiffHTML, paneFileHTML } from "../lib/view-html.mjs";
import { apply as applyHost } from "../lib/index.js";

function makeHandler(root) {
	let reg;
	const ctx = { webServer: { register: (x) => (reg = x), registerUpgrade: () => () => {} }, logger: { info() {} }, effect: (cb) => { const d = typeof cb === "function" ? cb() : undefined; if (typeof d === "function") { try { d(); } catch {} } return () => {}; } };
	applyHost(ctx, { workspaceRoot: root });
	return reg.handler;
}

async function request(handler, url, method = "GET", body) {
	const r = { code: null, type: null, body: "", buf: null };
	const res = {
		writeHead(c, h) { r.code = c; r.type = h?.["content-type"]; },
		end(b) { if (Buffer.isBuffer(b)) { r.buf = b; r.body = b.toString("utf8"); } else { r.body = String(b); } }
	};
	const req = { url, method };
	if (body !== undefined) req[Symbol.asyncIterator] = async function* () { yield Buffer.from(JSON.stringify(body)); };
	await handler(req, res);
	return r;
}

test("diffSides aligns unchanged lines and marks del/add", () => {
	const { rows, added, removed } = diffSides("a\nb\nc\n", "a\nx\nc\nd\n");
	assert.equal(added, 2);
	assert.equal(removed, 1);
	assert.deepEqual(rows.map((r) => r.kind), ["ctx", "del", "add", "ctx", "add"]);
	// unchanged lines stay aligned at the same row
	const ctxRows = rows.filter((r) => r.kind === "ctx");
	assert.equal(ctxRows[0].oldLn, ctxRows[0].newLn);
});

test("diffSides handles new file (null old) and full delete", () => {
	assert.equal(diffSides(null, "l1\nl2\n").added, 2);
	assert.equal(diffSides("x\ny\n", "").removed, 2);
	assert.deepEqual(contentLines("a\nb\n"), ["a", "b"]);
	assert.deepEqual(contentLines(""), []);
});

test("GET ?path=...&diff=1 renders side-by-side diff HTML", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-diff-"));
	const f = path.join(dir, "a.md");
	await fs.writeFile(f, "before\n");
	const h = makeHandler(dir);
	// seed a spill for session S1 under the same path
	const post = await request(h, "/browser/api/spill", "POST", { session: "S1", path: "a.md", old: "before\n", new: "after\n", ts: 1 });
	assert.equal(post.code, 200);
	// the file on disk is the "after" (agent already wrote it)
	await fs.writeFile(f, "after\n");
	const r = await request(h, "/browser/?path=a.md&diff=1&session=S1");
	assert.equal(r.code, 200);
	assert.match(r.type, /html/);
	assert.ok(r.body.includes("diffgrid"), "expected diff grid");
	assert.ok(r.body.includes("OLD"), "expected OLD column header");
	assert.ok(r.body.includes("NEW"), "expected NEW column header");
	assert.ok(r.body.includes("before"), "expected old side line");
	assert.ok(r.body.includes("after"), "expected new side line");
});

test("spill POST validates session/path and guards root escape", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-diff-"));
	await fs.writeFile(path.join(dir, "a.md"), "x");
	const h = makeHandler(dir);
	// missing session
	const noS = await request(h, "/browser/api/spill", "POST", { path: "a.md", old: "x", new: "y" });
	assert.equal(noS.code, 400);
	// malformed old
	const bad = await request(h, "/browser/api/spill", "POST", { session: "S1", path: "a.md", old: 42, new: "y" });
	assert.equal(bad.code, 400);
	// path escape -> 403 (the read guard runs before spill is stored)
	const esc = await request(h, "/browser/api/spill", "POST", { session: "S1", path: "../../etc/passwd", old: "a", new: "b" });
	assert.equal(esc.code, 403);
	// invalid json
	const badJson = await request(h, "/browser/api/spill", "POST", undefined);
	// body undefined -> readBody yields empty -> JSON.parse throws -> 400
	assert.equal(badJson.code, 400);
});

test("diff without spill renders pane with empty-state note", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-diff-"));
	await fs.writeFile(path.join(dir, "a.md"), "current\n");
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=a.md&diff=1&session=NOPE");
	assert.equal(r.code, 200);
	assert.ok(r.body.includes("No prior version") || r.body.includes("diffempty"), "expected no-spill fallback");
});

test("renderMarkdown: headings, code fence, list, table, inline", () => {
	const md = [
		"# Title",
		"",
		"Some **bold** and `code`.",
		"",
		"- a",
		"- b",
		"",
		"```js",
		"const x = 1;",
		"```",
		"",
		"| A | B |",
		"|---|---|",
		"| 1 | 2 |"
	].join("\n");
	const html = renderMarkdown(md);
	assert.ok(html.includes("<h1 class=\"md-h\">Title</h1>"));
	assert.ok(html.includes("<strong>bold</strong>"));
	assert.ok(html.includes("<code>code</code>"));
	assert.ok(html.includes("<ul class=\"md-list\">"));
	assert.ok(html.includes("<pre class=\"md-code lang-js\">"));
	assert.ok(html.includes("<table class=\"md-table\">"));
	assert.ok(html.includes("<td>1</td>"));
});

test("renderMarkdown escapes raw HTML (XSS-safe)", () => {
	const html = renderMarkdown("# hi\n\n<script>alert(1)</script>\n\n[link](javascript:alert(1))");
	assert.ok(!html.includes("<script>"), "raw script must not pass through");
	assert.ok(html.includes("&lt;script&gt;"), "script must be escaped as text");
	assert.ok(html.includes('href="#"'), "javascript: link must be neutralized");
});

test("paneFileHTML renders markdown preview for .md", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-md-"));
	await fs.writeFile(path.join(dir, "a.md"), "# Hello\n\nworld\n");
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=a.md");
	assert.equal(r.code, 200);
	assert.ok(r.body.includes("mdPreview"), "expected markdown preview block");
	assert.ok(r.body.includes("md-body"), "expected markdown body");
	assert.ok(r.body.includes("mdToggle"), "expected preview/raw toggle");
});
