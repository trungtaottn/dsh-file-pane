/**
 * dsh-file-pane / highlight
 *
 * Host-side syntax highlighting for the read-only file viewer, built on
 * Shiki's pure-JS core (`@shikijs/core` + `@shikijs/engine-javascript` —
 * no WASM, no full `shiki` entry). One long-lived highlighter singleton per
 * process plus an LRU cache keyed by file identity (realpath, size, mtime,
 * grammar) so warm reads are synchronous cache hits.
 *
 * Security contract:
 *   - Shiki escapes code text by construction (`<` → `&#x3C;` etc.).
 *   - `highlightLine` returns `null` on unknown lang / grammar error / any
 *     throw — the renderer then falls back to the existing `esc()` path.
 *   - Tokens are emitted with Shiki's dual-theme CSS variables
 *     (`--shiki-dark` / `--shiki-light`) and NO inline resolved color, so the
 *     pane's CSS layer picks dark/light from the environment (theme parity
 *     with DSH) and the switcher plan can flip a CSS layer without edits here.
 *   - Nothing from the file is ever injected raw.
 */
import { createHighlighterCore } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import themeDark from "@shikijs/themes/github-dark";
import themeLight from "@shikijs/themes/github-light";

// Pinned grammars via @shikijs/langs subpath imports — only the ~13 the
// viewer's MIME table serves. `enabledLangs` (Phase 5 settings) can shrink this.
const LANG_MODULES = [
	["javascript", "js"],
	["typescript", "ts"],
	["jsx", "jsx"],
	["tsx", "tsx"],
	["python", "py"],
	["go", "go"],
	["rust", "rs"],
	["json", "json"],
	["markdown", "md"],
	["shellscript", "sh"],
	["yaml", "yaml"],
	["css", "css"],
	["html", "html"]
];

/** Map the repo's MIME-table extensions → Shiki language ids. */
export const LANG_BY_EXT = {
	".js": "javascript",
	".mjs": "javascript",
	".cjs": "javascript",
	".ts": "typescript",
	".mts": "typescript",
	".cts": "typescript",
	".jsx": "jsx",
	".tsx": "tsx",
	".py": "python",
	".go": "go",
	".rs": "rust",
	".json": "json",
	".md": "markdown",
	".markdown": "markdown",
	".sh": "shellscript",
	".bash": "shellscript",
	".yaml": "yaml",
	".yml": "yaml",
	".css": "css",
	".html": "html",
	".htm": "html"
};

/** Allowlist of ids guardLang accepts (subset of LANG_MODULES by default). */
const KNOWN_IDS = new Set(LANG_MODULES.map(([name]) => name));

/** Default set of language ids when config does not restrict `enabledLangs`. */
export const DEFAULT_LANGS = LANG_MODULES.map(([name]) => name);

let singleton = null; // memoized createHighlighterCore promise

/** Resolve Shiki lang module by id (pinned subpath import, memoized). */
const langModuleCache = new Map();
async function loadLangModule(id) {
	if (langModuleCache.has(id)) return langModuleCache.get(id);
	const prom = import(`@shikijs/langs/${id}`).then((m) => m.default).catch(() => null);
	langModuleCache.set(id, prom);
	return prom;
}

/**
 * Build (once per process) the shared highlighter. `enabledLangs` restricts
 * which grammars are loaded (Phase 5 settings); unknown ids are filtered.
 * Returns a promise of the highlighter, or null when the core fails to build
 * (dependency missing / engine error) so callers degrade to plain text.
 */
export function getHighlighter(enabledLangs = DEFAULT_LANGS) {
	if (singleton) return singleton;
	const langs = (Array.isArray(enabledLangs) ? enabledLangs : DEFAULT_LANGS)
		.filter((id) => KNOWN_IDS.has(id))
		.filter((id, i, a) => a.indexOf(id) === i);
	singleton = (async () => {
		try {
			const grammarMods = await Promise.all(langs.map(loadLangModule));
			const grammarDefs = grammarMods.filter(Boolean);
			if (grammarDefs.length === 0) return null;
			return await createHighlighterCore({
				themes: [themeDark, themeLight],
				langs: grammarDefs,
				engine: createJavaScriptRegexEngine()
			});
		} catch {
			return null;
		}
	})();
	return singleton;
}

/** Reset the singleton (tests / settings change). */
export function resetHighlighter() { singleton = null; }

/** extname lookup → Shiki id, or null for unknown/extensionless. Pure. */
export function langForFile(name) {
	if (typeof name !== "string" || !name) return null;
	const i = name.lastIndexOf(".");
	if (i <= 0) return null; // no ext / dotfile
	const ext = name.slice(i).toLowerCase();
	return LANG_BY_EXT[ext] ?? null;
}

/** True when `id` is a Shiki grammar we pin / allow. */
export function guardLang(id) {
	return typeof id === "string" && KNOWN_IDS.has(id);
}

/* ── LRU token cache ── */

const CACHE_MAX = 200;
const cache = new Map(); // key -> { htmlLines, hits }

function cacheKey(real, st, lang) {
	return `${real}:${st?.size ?? 0}:${st?.mtimeMs ?? 0}:${lang}`;
}

export function getCached(real, st, lang) {
	const k = cacheKey(real, st, lang);
	const hit = cache.get(k);
	if (hit) {
		hit.hits++;
		cache.delete(k); cache.set(k, hit); // refresh LRU position
		return hit.htmlLines;
	}
	return null;
}

export function setCached(real, st, lang, htmlLines) {
	cache.set(cacheKey(real, st, lang), { htmlLines, hits: 1 });
	if (cache.size > CACHE_MAX) {
		// Evict least-recently-used (first key after refresh order).
		const oldest = cache.keys().next().value;
		cache.delete(oldest);
	}
}

/** Cache size (tests). */
export function cacheSize() { return cache.size; }

/**
 * Highlight one code line → escaped Shiki token HTML, or null on unknown lang
 * / grammar error / core failure. `lang` null → null (renderer falls back to
 * `esc(line)`). Uses the dual-theme CSS-var output so the pane's CSS decides
 * dark/light (theme parity without hardcoded colors).
 */
export async function highlightLine(line, lang, enabledLangs) {
	if (lang === null || lang === undefined || !guardLang(lang)) return null;
	const hl = await getHighlighter(enabledLangs);
	if (!hl) return null;
	try {
		const html = hl.codeToHtml(line, {
			lang,
			themes: { dark: "github-dark", light: "github-light" },
			defaultColor: false
		});
		return html;
	} catch {
		return null;
	}
}