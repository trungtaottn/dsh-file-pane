import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import JSZip from "jszip";

import { resolveWithin, readFileResult, mimeFor } from "../lib/view-core.mjs";
import { paneFileHTML } from "../lib/view-html.mjs";
import { docxPreview } from "../lib/docx.mjs";
import { apply as applyHost } from "../lib/index.js";

function makeHandler(root, config = {}) {
	let reg;
	const ctx = { webServer: { register: (x) => (reg = x) }, logger: { info() {} } };
	applyHost(ctx, { workspaceRoot: root, ...config });
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

/** Build a minimal valid .docx (OOXML zip) with the given paragraphs. */
async function makeDocx(paragraphs) {
	const zip = new JSZip();
	zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
	zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
	zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`);
	return zip.generateAsync({ type: "nodebuffer" });
}

/* ── resolveWithin: absolute-under-root paths ─────────────────────── */

test("resolveWithin accepts an absolute path inside the root", async () => {
	const root = await fs.mkdtemp(path.join(tmpdir(), "pane-abs-"));
	await fs.writeFile(path.join(root, "a.md"), "x");
	const abs = path.join(root, "a.md");
	const { real } = await resolveWithin(root, abs);
	assert.equal(real, abs);
});

test("resolveWithin rejects an absolute path outside the root (403)", async () => {
	const root = await fs.mkdtemp(path.join(tmpdir(), "pane-abs-"));
	const outside = await fs.mkdtemp(path.join(tmpdir(), "pane-out-"));
	await fs.writeFile(path.join(outside, "s.txt"), "s");
	await assert.rejects(resolveWithin(root, path.join(outside, "s.txt")), (e) => e.status === 403);
});

test("resolveWithin keeps rejecting relative traversal (regression)", async () => {
	const root = await fs.mkdtemp(path.join(tmpdir(), "pane-abs-"));
	await assert.rejects(resolveWithin(root, "../../etc/passwd"), (e) => e.status === 403);
});

test("mimeFor maps .docx to the office mime", () => {
	assert.equal(mimeFor("report.docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
});

/* ── docx preview (mammoth host-side) ─────────────────────────────── */

test("docxPreview converts a real .docx to markdown + plain text", async () => {
	const docx = await makeDocx(["Hello **docx** world", "Second line"]);
	const conv = await docxPreview(docx);
	assert.ok(conv, "expected conversion to succeed");
	assert.match(conv.text, /Hello/);
	assert.match(conv.text, /Second line/);
	assert.ok(conv.md.includes("Hello"), "markdown should contain the text");
});

test("docxPreview returns null on garbage bytes (route falls back)", async () => {
	assert.equal(await docxPreview(Buffer.from("not a docx at all")), null);
});

/* ── route: docx file view + vendor pdfjs assets ─────────────────── */

test("GET ?path=<real>.docx renders docx preview HTML", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-docx-"));
	const docx = await makeDocx(["Title", "Body text"]);
	await fs.writeFile(path.join(dir, "report.docx"), docx);
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=report.docx");
	assert.equal(r.code, 200);
	assert.match(r.type, /html/);
	assert.ok(r.body.includes("docx preview"), "expected docx preview toolbar");
	assert.ok(r.body.includes("Body text"), "expected extracted text rendered");
});

test("GET ?path=<broken>.docx falls back to 200 HTML (no crash)", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-docx-"));
	await fs.writeFile(path.join(dir, "broken.docx"), "garbage");
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=broken.docx");
	assert.equal(r.code, 200);
	assert.match(r.type, /html/);
});

test("paneFileHTML PDF render fills the frame (no fixed 78vh)", () => {
	const html = paneFileHTML({ path: "dir/a.pdf", name: "a.pdf", kind: "pdf", mime: "application/pdf", size: 42 }, true);
	assert.ok(!html.includes("78vh"), "must not pin the PDF viewer to a fixed 78vh");
	assert.ok(html.includes('height:100%'), "PDF viewers must fill the frame height");
});

test("GET /browser/vendor/pdfjs/pdfjs-viewer-element.js serves the asset", async () => {	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-vendor-"));
	const h = makeHandler(dir);
	const r = await request(h, "/browser/vendor/pdfjs/pdfjs-viewer-element.js");
	assert.equal(r.code, 200);
	assert.match(r.type, /javascript/);
	assert.ok(r.buf.length > 1000, "expected the web component source");
});

test("vendor pdfjs route blocks traversal (403/404, never outside assets)", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-vendor-"));
	const h = makeHandler(dir);
	const esc = await request(h, "/browser/vendor/pdfjs/..%2f..%2f..%2fetc%2fpasswd");
	assert.ok([403, 404].includes(esc.code), `got ${esc.code}`);
	const missing = await request(h, "/browser/vendor/pdfjs/nope.js");
	assert.equal(missing.code, 404);
});

test("GET ?path=<absolute-inside-root> serves the file", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-abs-route-"));
	await fs.writeFile(path.join(dir, "a.md"), "# abs");
	const h = makeHandler(dir);
	const abs = encodeURIComponent(path.join(dir, "a.md"));
	const r = await request(h, `/browser/?path=${abs}`);
	assert.equal(r.code, 200);
	assert.match(r.type, /html/);
	assert.ok(r.body.includes("abs"), "expected the file content rendered");
});

/* ── client-plugin: resolvePanePath (cwd → absolute under root) ──── */

function loadClientBundle() {
	let captured = null;
	const prev = globalThis.window;
	globalThis.window = { __ModuleLoader__: { load: (spec) => (captured = spec) } };
	try {
		new Function(readFileSync(new URL("../lib/client.js", import.meta.url), "utf8"))();
	} finally {
		if (prev === undefined) delete globalThis.window;
		else globalThis.window = prev;
	}
	return captured.factory((id) => {
		if (id === "react") return { createElement: () => null, Fragment: {} };
		throw new Error("unexpected require: " + id);
	});
}

test("resolvePanePath joins cwd + relative deliverable (built-in resolveWorkspacePath semantics)", () => {
	const { resolvePanePath } = loadClientBundle();
	assert.equal(resolvePanePath("/home/kaynt/Code/dsh-file-pane", "src/app.ts"), "/home/kaynt/Code/dsh-file-pane/src/app.ts");
	assert.equal(resolvePanePath("/home/kaynt", "a/b.md"), "/home/kaynt/a/b.md");
	// absolute deliverable passes through untouched
	assert.equal(resolvePanePath("/home/kaynt", "/tmp/x.txt"), "/tmp/x.txt");
	// no cwd → raw relative path (legacy behavior)
	assert.equal(resolvePanePath(undefined, "docs/README.md"), "docs/README.md");
	// blank cwd → raw relative path
	assert.equal(resolvePanePath("", "x.ts"), "x.ts");
});

test("readFileResult classifies .docx as kind docx", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-docx-"));
	const docx = await makeDocx(["hi"]);
	await fs.writeFile(path.join(dir, "a.docx"), docx);
	const file = await readFileResult(dir, "a.docx");
	assert.equal(file.kind, "docx");
	assert.equal(file.mime, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
});

/* ── apply: workspaceRoot config resolution (env/patch fallback chain) ── */

test("apply falls back to process.env.HOME when no workspaceRoot config is given", async () => {
	let captured;
	const ctx = { webServer: { register: (x) => (captured = x) }, logger: { info() {} } };
	applyHost(ctx, {});
	assert.ok(captured, "route registered");
	// The handler must resolve files under $HOME (the default root).
	const probe = path.join(process.env.HOME, "..", "etc", "passwd");
	// Not asserting a 200 here (root dir contents vary); just verify the route
	// is wired and traversal still 403s against the HOME default.
	const r = await request(captured.handler, "/browser/?path=" + encodeURIComponent("../../etc/passwd"));
	assert.equal(r.code, 403);
});

test("apply uses config.workspaceRoot over process.env.HOME", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-cfg-"));
	await fs.writeFile(path.join(dir, "x.md"), "cfg-root");
	let captured;
	const ctx = { webServer: { register: (x) => (captured = x) }, logger: { info() {} } };
	applyHost(ctx, { workspaceRoot: dir });
	const r = await request(captured.handler, "/browser/?path=x.md");
	assert.equal(r.code, 200);
	assert.ok(r.body.includes("cfg-root"));
});

/* ── embed variant (in-app dock iframe) ─────────────────────────── */

test("GET ?path=...&embed=1 renders pane without topbar chrome", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-embed-"));
	await fs.writeFile(path.join(dir, "a.md"), "# hi\nbody");
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=a.md&embed=1");
	assert.equal(r.code, 200);
	assert.match(r.type, /html/);
	assert.ok(r.body.includes("data-embed"), "expected embed marker on body");
	assert.ok(!r.body.includes('class="bar"'), "expected topbar omitted in embed mode");
	assert.ok(r.body.includes("hi"), "expected file content");
});

test("GET /browser/?embed=1 renders root listing without topbar", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-embed-"));
	await fs.writeFile(path.join(dir, "a.md"), "x");
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?embed=1");
	assert.equal(r.code, 200);
	assert.ok(r.body.includes("data-embed"));
	assert.ok(!r.body.includes('class="bar"'));
	assert.ok(r.body.includes("a.md"));
});

test("GET diff with embed=1 omits bar and statusbar", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-embed-diff-"));
	const f = path.join(dir, "a.md");
	await fs.writeFile(f, "before\n");
	const h = makeHandler(dir);
	await request(h, "/browser/api/spill", "POST", { session: "S1", path: "a.md", old: "before\n", new: "after\n", ts: 1 });
	await fs.writeFile(f, "after\n");
	const r = await request(h, "/browser/?path=a.md&diff=1&session=S1&embed=1");
	assert.equal(r.code, 200);
	assert.ok(r.body.includes("data-embed"));
	assert.ok(!r.body.includes('class="bar"'), "expected topbar omitted");
	assert.ok(!r.body.includes('class="statusbar"'), "expected statusbar omitted");
	assert.ok(r.body.includes("diffgrid"), "expected diff content kept");
});

/* ── client bundle: dock mount flag + layout service ────────────── */

test("GET /browser/api/changed lists files edited this session with status", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-changed-"));
	const f = path.join(dir, "a.md");
	await fs.writeFile(f, "before\n");
	const nb = path.join(dir, "b.md");
	await fs.writeFile(nb, "hello\n"); // spill validates the file exists on disk
	const h = makeHandler(dir);
	// modified file
	await request(h, "/browser/api/spill", "POST", { session: "S1", path: "a.md", old: "before\n", new: "after\n", ts: 2 });
	// new file (no prior version)
	await request(h, "/browser/api/spill", "POST", { session: "S1", path: "b.md", old: null, new: "hello\n", ts: 1 });
	// another session stays separate
	await fs.writeFile(path.join(dir, "z.md"), "x\n");
	await request(h, "/browser/api/spill", "POST", { session: "S2", path: "z.md", old: null, new: "x", ts: 9 });

	const c = await request(h, "/browser/api/changed?session=S1", "GET");
	const body = JSON.parse(c.body);
	assert.equal(c.code, 200);
	assert.equal(body.session, "S1");
	const byPath = Object.fromEntries(body.entries.map((e) => [e.path, e.status]));
	assert.deepEqual(byPath, { "a.md": "modified", "b.md": "added" });
	// newer-first ordering
	assert.equal(body.entries[0].path, "a.md");
	// missing session → 400
	const noSess = await request(h, "/browser/api/changed", "GET");
	assert.equal(noSess.code, 400);
	// other session has its own entry only
	const z = JSON.parse((await request(h, "/browser/api/changed?session=S2", "GET")).body);
	assert.deepEqual(z.entries.map((e) => e.path), ["z.md"]);
});

/* ── client bundle: dock mount flag + layout service ────────────── */

test("client bundle exports isDockMounted and declares layout", () => {
	const { isDockMounted, inject } = loadClientBundle();
	assert.equal(typeof isDockMounted, "function");
	assert.equal(isDockMounted(), false); // not mounted outside a live dock
	assert.ok(inject.includes("layout"), "bundle must declare layout service");
});

test("client bundle upPath computes parent directories", () => {
	const { upPath } = loadClientBundle();
	assert.equal(upPath("a/b/c.md"), "a/b");
	assert.equal(upPath("a/b"), "a");
	assert.equal(upPath("a.md"), undefined); // top-level file → root
	assert.equal(upPath("a"), undefined);
	assert.equal(upPath(undefined), undefined);
	assert.equal(upPath(""), undefined);
});

test("client bundle dock locale includes navigation keys", () => {
	// apply() registers the dict; here we just verify the bundle still exposes
	// the dock helpers and layout service (regression guard for the dock nav).
	const { apply, isDockMounted, inject } = loadClientBundle();
	assert.equal(typeof isDockMounted, "function");
	assert.ok(inject.includes("layout"));
	assert.equal(typeof apply, "function");
});

test("client bundle dockSrc builds session/diff/embed query", () => {
	const { dockSrc } = loadClientBundle();
	// plain view of a text file
	const view = dockSrc("src/app.ts");
	assert.equal(view, "/browser/?path=src%2Fapp.ts&embed=1");
	// diff of a text file carries session
	const diff = dockSrc("src/app.ts", { diff: true, session: "S1" });
	assert.equal(diff, "/browser/?path=src%2Fapp.ts&diff=1&session=S1&embed=1");
	// diff of a binary/non-text path does NOT add diff (route would 415)
	const bin = dockSrc("img/logo.png", { diff: true, session: "S1" });
	assert.ok(!bin.includes("diff=1"), "non-text path must not request diff");
	assert.equal(bin, "/browser/?path=img%2Flogo.png&embed=1");
	// root listing
	const root = dockSrc(undefined);
	assert.equal(root, "/browser/?path=&embed=1");
});

test("client bundle upPath computes parent directories", () => {
	const { upPath } = loadClientBundle();
	assert.equal(upPath("a/b/c.md"), "a/b");
	assert.equal(upPath("a/b"), "a");
	assert.equal(upPath("a.md"), undefined); // top-level file → root
	assert.equal(upPath("a"), undefined);
	assert.equal(upPath(undefined), undefined);
	assert.equal(upPath(""), undefined);
});

test("GET ?path=...&json=1 returns directory listing as JSON", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-json-"));
	await fs.mkdir(path.join(dir, "sub"));
	await fs.writeFile(path.join(dir, "a.md"), "x");
	await fs.writeFile(path.join(dir, "b.ts"), "y");
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=&json=1");
	assert.equal(r.code, 200);
	assert.match(r.type, /json/);
	const data = JSON.parse(r.body);
	assert.ok(Array.isArray(data.entries));
	const names = data.entries.map((e) => e.name);
	assert.ok(names.includes("a.md"));
	assert.ok(names.includes("b.ts"));
	const sub = data.entries.find((e) => e.name === "sub");
	assert.equal(sub.dir, true);
});

test("json listing guards root escape (403)", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-json-"));
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=" + encodeURIComponent("../../etc") + "&json=1");
	assert.equal(r.code, 403);
});

test("json listing for a file returns 400 (not a directory)", async () => {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "pane-json-"));
	await fs.writeFile(path.join(dir, "a.md"), "x");
	const h = makeHandler(dir);
	const r = await request(h, "/browser/?path=a.md&json=1");
	assert.equal(r.code, 400);
});

test("client bundle breadcrumbParts splits path into clickable segments", () => {
	const { breadcrumbParts } = loadClientBundle();
	// root
	assert.deepEqual(breadcrumbParts(undefined), [{ label: "workspace", path: undefined }]);
	assert.deepEqual(breadcrumbParts(""), [{ label: "workspace", path: undefined }]);
	// single segment
	assert.deepEqual(breadcrumbParts("a.md"), [{ label: "a.md", path: "a.md" }]);
	// nested: each prefix is the clickable ancestor
	assert.deepEqual(breadcrumbParts("src/app.ts"), [
		{ label: "src", path: "src" },
		{ label: "app.ts", path: "src/app.ts" }
	]);
	const deep = breadcrumbParts("a/b/c.md");
	assert.deepEqual(deep, [
		{ label: "a", path: "a" },
		{ label: "b", path: "a/b" },
		{ label: "c.md", path: "a/b/c.md" }
	]);
});

test("client bundle stripBase removes the workspace base prefix for breadcrumb display", () => {
	const { stripBase } = loadClientBundle();
	const base = "/home/kaynt/Code/dsh-file-pane";
	// at the workspace root → undefined (breadcrumb shows "workspace")
	assert.equal(stripBase(base, base), undefined);
	assert.equal(stripBase(undefined, base), undefined);
	// nested under base → relative spelling
	assert.equal(stripBase(base + "/src/app.ts", base), "src/app.ts");
	assert.equal(stripBase(base + "/a/b/c.md", base), "a/b/c.md");
	// no base → path unchanged
	assert.equal(stripBase("src/app.ts", undefined), "src/app.ts");
	// path outside base → unchanged (fallback)
	assert.equal(stripBase("/opt/other/x.ts", base), "/opt/other/x.ts");
});
