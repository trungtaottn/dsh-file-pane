/**
 * Snippet XSS-safety contract tests for the dock search rows.
 *
 * The ONE place a future contributor could paint raw match text. splitHighlight
 * must escape everything and only wrap the match in a static <mark>; nothing
 * from the rg record can ever become executable HTML.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, splitHighlight } from "./theme-dist/search-text.js";

test("escapeHtml neutralizes tags, quotes and entities", () => {
	assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
	assert.equal(escapeHtml('<img onerror="x" />'), '&lt;img onerror=&quot;x&quot; /&gt;');
	assert.equal(escapeHtml("a&b"), "a&amp;b");
	assert.equal(escapeHtml("it's"), "it&#39;s");
});

test("splitHighlight escapes pre/mid/post and wraps only the middle in <mark>", () => {
	const out = splitHighlight('fetch "data" now', 'fetch ', ' now');
	assert.equal(out, 'fetch <mark>&quot;data&quot;</mark> now');
});

test("splitHighlight makes '<script>' snippets inert (no raw angle brackets)", () => {
	// pre contains a <script> that must be escaped; the highlighted middle too.
	const out = splitHighlight('<script>x</script><b>y</b>', '<script>x', '</script><b>y</b>');
	assert.ok(!/<(?!mark|\/mark>)/i.test(out), `no unescaped tag beyond our <mark> (got: ${out})`);
	assert.ok(out.includes("&lt;script&gt;"), "script tag is escaped");
	assert.ok(out.includes("<mark>"), "mark wrapping present");
	assert.ok(/<mark>[^<]*<\/mark>/.test(out), "mark inner does not contain more tags");
});

test("splitHighlight reconstructs the middle from pre/post slice extents", () => {
	// text="abcDEFghi", pre="abc", post="ghi" -> middle="DEF" escaped
	const out = splitHighlight("abcDEFghi", "abc", "ghi");
	assert.equal(out, "abc<mark>DEF</mark>ghi");
	// an angle-bracket middle is escaped inside the mark: text="a<b>c", pre="a", post="c"
	const out2 = splitHighlight("a<b>c", "a", "c");
	assert.equal(out2, "a<mark>&lt;b&gt;</mark>c");
});

test("splitHighlight handles empty/edge middle gracefully", () => {
	assert.equal(splitHighlight("abc", "abc", ""), "abc<mark></mark>");
	assert.equal(splitHighlight("", "", ""), "<mark></mark>");
});