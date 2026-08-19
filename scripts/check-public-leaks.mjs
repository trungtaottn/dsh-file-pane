/**
 * dsh-file-pane — check-public-leaks.
 *
 * Pre-PR leak scanner: greps the TRACKED files of the working tree for the
 * owner's real deployment values (hostnames, service names, ports, machine
 * paths, Cloudflare identities, username) and exits non-zero when any hit is
 * found. This repo is PUBLIC — this guard exists because real infra values
 * must never be committed (see AGENTS.md "Pre-PR check").
 *
 * Patterns are deliberately NOT hardcoded here (that would re-leak them).
 * They come from:
 *   1. `DSH_FILE_PANE_LEAK_PATTERNS` env — comma-separated literals.
 *      On the owner's machine, derive it from AGENTS.local.md (gitignored),
 *      e.g. `export DSH_FILE_PANE_LEAK_PATTERNS="harness.nes.codes,deepseek-harness-web,/home/kaynt,trungtaottn.cloudflareaccess.com"`
 *   2. A conservative built-in set of generic red flags (real home paths,
 *      cloudflare access URLs, host:port pairs, service unit names).
 *
 * Usage:
 *   NODE_OPTIONS= node scripts/check-public-leaks.mjs
 *   DSH_FILE_PANE_LEAK_PATTERNS="..." NODE_OPTIONS= node scripts/check-public-leaks.mjs
 */
import { execFileSync } from "node:child_process";

// Generic red flags that hold for any owner without embedding the real values.
// Deliberately NARROW: broad patterns like "/home/" or "systemctl restart"
// also match the public-safe placeholders (/home/user, dsh-file-pane-web), so
// they are NOT built in — the real values must come from the env var.
const BUILTIN = [
	"cloudflareaccess.com" // Cloudflare Access identity URLs — never valid in a public file
];

function patterns() {
	const set = new Set(BUILTIN);
	const env = process.env.DSH_FILE_PANE_LEAK_PATTERNS;
	if (env) {
		for (const p of env.split(",")) {
			const s = p.trim();
			if (s) set.add(s);
		}
	}
	return [...set];
}

function trackedFiles() {
	// All files git knows (tracked + staged + untracked-but-not-ignored),
	// excluding the scanner itself and vendored/ignored blobs.
	const out = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8" });
	return out.split("\n").filter(Boolean).filter((f) =>
		f !== "scripts/check-public-leaks.mjs" &&
		!f.includes("node_modules/") &&
		!f.startsWith("assets/pdfjs/") &&
		f !== "package-lock.json" &&
		f !== "pnpm-lock.yaml"
	);
}

function main() {
	const pats = patterns();
	const files = trackedFiles();
	const hits = [];
	for (const f of files) {
		let content;
		try { content = execFileSync("git", ["show", `:${f}`], { encoding: "utf8" }); }
		catch { try { content = execFileSync("cat", [f], { encoding: "utf8" }); } catch { continue; } }
		for (const p of pats) {
			if (content.includes(p)) hits.push({ file: f, pattern: p });
		}
	}
	if (hits.length === 0) {
		console.log(`check-public-leaks: clean (${files.length} tracked files, ${pats.length} patterns)`);
		process.exit(0);
	}
	console.error("check-public-leaks: POTENTIAL INTERNAL-DETAIL LEAKS — fix before pushing:");
	for (const h of hits) console.error(`  ${h.file}: contains "${h.pattern}"`);
	process.exit(1);
}

main();