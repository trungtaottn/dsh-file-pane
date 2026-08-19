/**
 * Search module + ripgrep contract tests (host side).
 *
 * isValidPattern / sanitizeGlobs / clampMax are pure security gates. searchStream
 * exercises the real @vscode/ripgrep binary against a fixture workspace,
 * asserting root/ignore safety (node_modules/.git/hidden never leak), literal
 * `-foo` interpretation, per-mode behavior, and max-truncation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { isValidPattern, sanitizeGlobs, clampMax, searchStream, SEARCH_MAX_CEILING, SEARCH_DEFAULT_MAX } from "../lib/search.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = resolve(ROOT, "test/fixtures/search");

async function collect(ws, opts) {
	const out = [];
	for await (const rec of searchStream(ws, { ...opts, max: opts.max ?? 100 })) out.push(rec);
	return out;
}

test("isValidPattern accepts printable ASCII and rejects unsafe input", () => {
	for (const ok of ["fetch", "foo bar", "a-b_c.d/*", "-leading", "x".repeat(1024), "9\t", "   ", "a\nb"]) {
		assert.equal(isValidPattern(ok), true, `should accept: ${JSON.stringify(ok)}`);
	}
	for (const bad of ["", "x".repeat(1025), "a\u0000b", "a\u0008b", "a\u001Bb", "a\u000Bb", "a\u007Fb", "héllo", "unicode\u00e9", 123, null, undefined]) {
		assert.equal(isValidPattern(bad), false, `should reject: ${JSON.stringify(bad)}`);
	}
});

test("sanitizeGlobs allowlists safe globs and drops shell/space/quoted entries", () => {
	assert.deepEqual(sanitizeGlobs("*.js,src/**"), ["*.js", "src/**"]);
	assert.deepEqual(sanitizeGlobs("src/**"), ["src/**"]);
	assert.deepEqual(sanitizeGlobs("a b"), []);
	assert.deepEqual(sanitizeGlobs("x;rm -rf /"), []);
	assert.deepEqual(sanitizeGlobs("\"; rm"), []);
	assert.deepEqual(sanitizeGlobs("*.js, bad??${x}"), ["*.js"]);
	assert.deepEqual(sanitizeGlobs("a\nb"), []);
	assert.deepEqual(sanitizeGlobs(""), []);
	assert.deepEqual(sanitizeGlobs(undefined), []);
	assert.deepEqual(sanitizeGlobs(null), []);
});

test("clampMax caps to server ceiling and falls back to default", () => {
	assert.equal(clampMax(50), 50);
	assert.equal(clampMax("9999"), SEARCH_MAX_CEILING);
	assert.equal(clampMax(SEARCH_MAX_CEILING + 1), SEARCH_MAX_CEILING);
	assert.equal(clampMax(undefined), SEARCH_DEFAULT_MAX);
	assert.equal(clampMax(""), SEARCH_DEFAULT_MAX);
	assert.equal(clampMax(0), SEARCH_DEFAULT_MAX);
	assert.equal(clampMax("abc"), SEARCH_DEFAULT_MAX);
});

test("content mode finds matches, ignores node_modules/.git/hidden by default", async () => {
	const out = await collect(FIXTURE, { q: "fetch", mode: "content" });
	const paths = out.filter((r) => r.t === "match").map((r) => r.path);
	assert.ok(paths.some((p) => p.endsWith("src/app.js")), "found src/app.js matches");
	assert.ok(paths.every((p) => !/node_modules|\.git/.test(p)), "ignore-list kept node_modules/.git out");
	assert.ok(!paths.some((p) => /hiddenfile/.test(p)), "hidden file not searched without --hidden");
	assert.equal(out[out.length - 1].t, "done");
});

test("pattern -foo is treated literally (the '--' guard), not a flag", async () => {
	const out = await collect(FIXTURE, { q: "-foo", mode: "content" });
	const matches = out.filter((r) => r.t === "match");
	assert.equal(matches.length, 0, "no literal -foo in fixtures, but no flag error either");
	// Must end in done, not error — a flag-parse failure would surface as error.
	assert.equal(out.at(-1).t, "done");
});

test("name mode finds file by substring in its path", async () => {
	const out = await collect(FIXTURE, { q: "io", mode: "name" });
	const paths = out.filter((r) => r.t === "match").map((r) => r.path);
	assert.ok(paths.includes("io.txt"), `name mode found io.txt (got ${paths})`);
	assert.ok(!paths.some((p) => /node_modules|\.git/.test(p)));
});

test("hidden toggle searches hidden files but node_modules/.git stay out", async () => {
	const out = await collect(FIXTURE, { q: "sneaky", mode: "content", hidden: true });
	const paths = out.filter((r) => r.t === "match").map((r) => r.path);
	assert.ok(paths.some((p) => /hiddenfile/.test(p)), `hidden toggle reached .hiddenfile.txt (got ${paths})`);
	assert.ok(!paths.some((p) => /node_modules|\.git/.test(p)));
});

test("max cap yields done with truncated:true and bounds the match count", async () => {
	// src/app.js has 2 lines with "fetch". max=1 -> first match then truncated.
	const out = await collect(FIXTURE, { q: "fetch", mode: "content", max: 1 });
	const matches = out.filter((r) => r.t === "match");
	assert.ok(matches.length <= 1, "bounded by max");
	const done = out.at(-1);
	assert.equal(done.t, "done");
	assert.equal(done.truncated, true);
});

/* ── Route-level contract: GET /browser/api/search streams NDJSON. ── */

const { apply: applyPlugin } = await import("../lib/index.js");

function makeHandler(root) {
	let reg;
	const ctx = { webServer: { register: (x) => (reg = x), registerUpgrade: () => () => {} }, logger: { info() {} }, effect: (cb) => { const d = typeof cb === "function" ? cb() : undefined; if (typeof d === "function") { try { d(); } catch {} } return () => {}; } };
	applyPlugin(ctx, { workspaceRoot: root, searchMax: 200, searchMode: "content" });
	return reg.handler;
}

async function ndjsonRequest(handler, url) {
	const r = { code: null, type: null, lines: [] };
	const res = {
		writeHead(c, h) { r.code = c; r.type = h?.["content-type"]; },
		write(chunk) { if (typeof chunk === "string" && chunk) { for (const line of chunk.split("\n")) { if (line.trim()) r.lines.push(JSON.parse(line)); } } },
		end() {},
		on() {}
	};
	await handler({ method: "GET", url, on: () => {} }, res);
	return r;
}

test("GET /browser/api/search streams NDJSON records for the workspace", async () => {
	const h = makeHandler(FIXTURE);
	const r = await ndjsonRequest(h, "/browser/api/search?q=fetch&mode=content&workspace=" + encodeURIComponent(FIXTURE));
	assert.equal(r.code, 200);
	assert.match(r.type, /x-ndjson/);
	const types = r.lines.map((l) => l.t);
	assert.ok(types.includes("match"), "yields match records");
	assert.equal(r.lines.at(-1).t, "done", "stream ends with done");
	assert.ok(r.lines.some((l) => l.t === "match" && !/node_modules|\.git/.test(l.path)), "matches are not in ignored dirs");
});

test("GET /browser/api/search rejects an invalid pattern with 400", async () => {
	const h = makeHandler(FIXTURE);
	const r = await ndjsonRequest(h, "/browser/api/search?q=" + encodeURIComponent("x".repeat(2000)) + "&mode=content&workspace=" + encodeURIComponent(FIXTURE));
	assert.equal(r.code, 400);
});

test("GET /browser/api/search clamps max to the server ceiling", async () => {
	const h = makeHandler(FIXTURE);
	const r = await ndjsonRequest(h, "/browser/api/search?q=fetch&mode=content&max=9999&workspace=" + encodeURIComponent(FIXTURE));
	assert.equal(r.code, 200);
	const done = r.lines.at(-1);
	assert.equal(done.t, "done");
	assert.ok(r.lines.filter((l) => l.t === "match").length <= 1000, "row count clamped <= 1000");
});