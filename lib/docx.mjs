/**
 * dsh-file-pane / docx
 *
 * Host-side .docx → safe-markdown preview conversion via mammoth.
 *
 * The pane is server-rendered HTML with zero client JS, so docx is converted
 * on the host (not in the browser). mammoth output (markdown or raw text) is
 * ALWAYS rendered through the XSS-safe pipeline in view-core
 * (renderMarkdown/escapeHtml) — a .docx is untrusted file content, never
 * injected raw.
 *
 * mammoth is imported lazily (dynamic import) so plugin startup stays cheap —
 * the ~2MB library is only loaded when a .docx is actually opened.
 */
let mammothPromise;

function loadMammoth() {
	if (!mammothPromise) mammothPromise = import("mammoth");
	return mammothPromise;
}

/**
 * Convert a .docx buffer into { md, text, truncated } where:
 *   - md: markdown (converted by mammoth) — the route renders it through
 *     renderMarkdown (XSS-safe) for the preview
 *   - text: plain text (for the raw tab / copy)
 * Returns null when conversion fails (the route falls back to binary view).
 * @param buf - full .docx bytes.
 * @param maxTextBytes - cap on the converted text (defensive; mammoth output is
 *   bounded by the source, but a decompression bomb could exceed it).
 */
export async function docxPreview(buf, maxTextBytes = 2 * 1024 * 1024) {
	try {
		const { convertToMarkdown, extractRawText } = await loadMammoth();
		const [md, raw] = await Promise.all([
			convertToMarkdown({ buffer: buf }),
			extractRawText({ buffer: buf })
		]);
		const text = raw.value ?? "";
		const truncated = text.length > maxTextBytes;
		return {
			md: (md.value ?? "").slice(0, maxTextBytes),
			text: truncated ? text.slice(0, maxTextBytes) : text,
			truncated
		};
	} catch {
		return null; // corrupt/unsupported docx → route falls back to binary note
	}
}
