/**
 * Syntax-highlight contract tests (lib/highlight.mjs + renderer integration).
 *
 * Lang mapping, XSS-safe token output, LRU stat-identity, and the
 * sanitizeTokenHtml whitelist — all host-side, no browser.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { langForFile, guardLang, highlightLine, getHighlighter, resetHighlighter, DEFAULT_LANGS, LANG_BY_EXT, getCached, setCached, cacheSize } from "../lib/highlight.mjs";
import { sanitizeTokenHtml } from "../lib/view-html.mjs";

// Build the highlighter once (slow first call) so per-test calls are warm.
before(async () => { await getHighlighter(); });

test("langForFile maps known extensions, null for unknown/extensionless", () => {
	assert.equal(langForFile("src/app.ts"), "typescript");
	assert.equal(langForFile("app.py"), "python");
	assert.equal(langForFile("a.js"), "javascript");
	assert.equal(langForFile("README"), null);
	assert.equal(langForFile("Makefile"), null);
	assert.equal(langForFile(""), null);
	assert.equal(langForFile("dir/noext"), null);
	assert.ok(Object.keys(LANG_BY_EXT).length >= 13, "MIME table coverage");
});

test("guardLang accepts pinned ids, rejects unknown/empty", () => {
	assert.equal(guardLang("javascript"), true);
	assert.equal(guardLang("python"), true);
	assert.equal(guardLang("notalang"), false);
	assert.equal(guardLang(""), false);
	assert.equal(guardLang(null), false);
});

test("highlightLine returns token HTML for a code line (dual-theme CSS vars)", async () => {
	const out = await highlightLine("const x: number = 1;", "typescript");
	assert.ok(out && out.includes("--shiki-dark"), "dual-theme dark var present");
	assert.ok(out && out.includes("<span"), "token spans present");
	assert.ok(out && !out.includes("style=\"color:#"), "no inline resolved color (theme parity via vars)");
});

test("highlightLine escapes hostile input (no raw script tag survives)", async () => {
	const out = await highlightLine("<script>alert(1)</script>", "javascript");
	assert.ok(out, "highlight succeeded");
	assert.ok(!out.includes("<script>alert"), "raw script tag never survives");
	assert.ok(out.includes("&#x3C;") || out.includes("&lt;"), "angle bracket escaped");
});

test("highlightLine returns null for unknown lang / grammar fail (never throws)", async () => {
	assert.equal(await highlightLine("x", "notalang"), null);
	assert.equal(await highlightLine("x", null), null);
	assert.equal(await highlightLine("x", undefined), null);
});

test("LRU cache is keyed by stat identity (size/mtime)", () => {
	const real = "/ws/src/app.ts";
	const st1 = { size: 100, mtimeMs: 1000 };
	const st2 = { size: 100, mtimeMs: 2000 }; // changed mtime → different key
	setCached(real, st1, "typescript", ["<span>a</span>"]);
	assert.deepEqual(getCached(real, st1, "typescript"), ["<span>a</span>"]);
	assert.equal(getCached(real, st2, "typescript"), null, "changed mtime → miss");
	assert.equal(getCached(real, st1, "python"), null, "different grammar → miss");
});

test("LRU evicts oldest entry beyond CACHE_MAX (200)", () => {
	for (let i = 0; i < 210; i++) {
		setCached(`/ws/f${i}.ts`, { size: i, mtimeMs: i }, "typescript", ["x"]);
	}
	assert.ok(cacheSize() <= 200, "cache bounded");
	// Evicted keys: re-reading the least-recently-touched (first inserted) misses.
	assert.equal(getCached("/ws/f0.ts", { size: 0, mtimeMs: 0 }, "typescript"), null, "f0 evicted (LRU)");
});

test("sanitizeTokenHtml strips on*=/javascript: and non-allowlist tags", () => {
	assert.equal(sanitizeTokenHtml("<span>hi</span>"), "<span>hi</span>");
	assert.ok(!sanitizeTokenHtml('<span onerror="x()">hi</span>').includes("onerror"));
	assert.ok(!sanitizeTokenHtml('<span href="javascript:alert(1)">x</span>').includes("javascript:"));
	assert.ok(!sanitizeTokenHtml("<img src=x onerror=y>").includes("<img"));
	assert.equal(sanitizeTokenHtml(""), "");
	assert.equal(sanitizeTokenHtml(null), "");
});

test("DEFAULT_LANGS is the pinned 13-language set", () => {
	assert.equal(DEFAULT_LANGS.length, 13);
	assert.ok(DEFAULT_LANGS.includes("javascript") && DEFAULT_LANGS.includes("markdown"));
});

resetHighlighter();