/**
 * Intraline diff contract tests (view-core inlineWords / attachInlineMarks).
 *
 * diffSides is untouched; inlineWords marks changed segments, pairing attaches
 * marks to the right del/add neighbor, and INLINE_MAX gates the whole pass.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { diffSides, inlineWords, attachInlineMarks, INLINE_MAX } from "../lib/view-core.mjs";

test("inlineWords splits a changed pair into ch/del/add segments", () => {
	const { old, next } = inlineWords("foo(x, 1, 3);", "foo(x, 2, 3);");
	assert.deepEqual(old, [{ text: "foo(x, ", type: "ch" }, { text: "1", type: "del" }, { text: ", 3);", type: "ch" }]);
	assert.deepEqual(next, [{ text: "foo(x, ", type: "ch" }, { text: "2", type: "add" }, { text: ", 3);", type: "ch" }]);
});

test("inlineWords with no change yields all-ch segments", () => {
	const { old, next } = inlineWords("same line", "same line");
	assert.ok(old.every((s) => s.type === "ch"));
	assert.ok(next.every((s) => s.type === "ch"));
	assert.equal(old.map((s) => s.text).join(""), "same line");
});

test("inlineWords escapes nothing itself (renderer esc()s) but keeps raw text segments", () => {
	const { old } = inlineWords("<script>a</script>", "b");
	assert.ok(old.some((s) => s.text.includes("<script>")), "segments carry raw text (renderer escapes)");
});

test("attachInlineMarks pairs a del with its nearest following add", () => {
	const rows = diffSides("foo(x, 1);\nsame\n", "foo(x, 2);\nsame\n").rows;
	attachInlineMarks(rows);
	const del = rows.find((r) => r.kind === "del");
	const add = rows.find((r) => r.kind === "add");
	assert.ok(del.inline && del.inline.old, "del row got inline marks");
	assert.ok(add.inline && add.inline.next, "paired add row got inline marks");
	// the changed segment is a del/add pair at the same index
	const delSeg = del.inline.old.find((s) => s.type === "del");
	const addSeg = add.inline.next.find((s) => s.type === "add");
	assert.ok(delSeg && delSeg.text === "1", "del segment is the changed token");
	assert.ok(addSeg && addSeg.text === "2", "add segment is the changed token");
});

test("attachInlineMarks skips when rows exceed INLINE_MAX", () => {
	const big = [];
	for (let i = 0; i < INLINE_MAX + 10; i++) {
		big.push({ kind: i % 2 ? "del" : "add", oldLn: i, newLn: i, oldText: "a" + i, newText: "b" + i, inline: undefined });
	}
	const out = attachInlineMarks(big);
	assert.equal(out.length, big.length);
	assert.ok(out.every((r) => !r.inline), "no jsdiff pass above INLINE_MAX");
});

test("diffSides signature/output unchanged (ctx rows + stats)", () => {
	const r = diffSides("a\nb\n", "a\nc\nb\n");
	assert.deepEqual(Object.keys(r).sort(), ["added", "files", "removed", "rows"]);
	assert.equal(r.added, 1);
	assert.equal(r.removed, 0);
	assert.ok(r.rows.some((x) => x.kind === "add" && x.newText === "c"));
});