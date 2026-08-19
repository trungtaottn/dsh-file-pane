/**
 * dsh-file-pane / search-text
 *
 * Pure, XSS-safe helpers for rendering search result snippets in the dock.
 * The single rule: match text is ALWAYS escapeHtml()'d first, and the only
 * composed HTML a caller ever lands in the DOM is the static `<mark>` wrapper —
 * never a raw match substring. This file is deliberately dependency-free so it
 * can be unit-tested directly (and esbuild-bundled for node --test).
 */

/** Escape a string for safe insertion into text/html (never build markup from raw input). */
export function escapeHtml(s) {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Build an XSS-safe snippet string from a match line split into `pre`, the
 * matched middle, and `post`. The middle is reconstructed from `text` using the
 * `pre`/`post` slice extents (matching how the host's deriveMatch reports
 * offsets). The result is fully escaped with only the static `<mark>` tags
 * composed — safe to feed to dangerouslySetInnerHTML.
 *
 * @param {string} text - full match line.
 * @param {string} pre  - text before the match span (already a slice of `text`).
 * @param {string} post - text after the match span (already a slice of `text`).
 * @returns {string} escaped `pre<mark>middle</mark>post`
 */
export function splitHighlight(text, pre, post) {
	const full = String(text ?? "");
	const before = String(pre ?? "");
	const after = String(post ?? "");
	const middle = before.length + after.length <= full.length
		? full.slice(before.length, full.length - after.length)
		: full.slice(before.length);
	return escapeHtml(before) + "<mark>" + escapeHtml(middle) + "</mark>" + escapeHtml(after);
}