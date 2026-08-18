/**
 * dsh-file-pane — PDF.js viewer asset builder.
 *
 * Copies the standalone `pdfjs-viewer-element` dist (a drop-in PDF.js default
 * viewer web component with no runtime deps) into `assets/pdfjs/`, which the
 * host route serves at `/browser/vendor/pdfjs/<file>` behind a whitelist.
 *
 * The web component imports its hash-named chunks relative to its own URL, so
 * the WHOLE dist directory must be served — we copy it verbatim and the route
 * allows only files that live under that directory.
 *
 * Run before `npm pack` / deployment (`npm run build:assets`); `pretest` runs
 * it so CI always has a fresh copy.
 */
import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, "node_modules", "pdfjs-viewer-element", "dist");
const OUT = join(ROOT, "assets", "pdfjs");

async function main() {
	await rm(OUT, { recursive: true, force: true });
	await mkdir(OUT, { recursive: true });
	const files = await readdir(SRC);
	let copied = 0;
	for (const f of files) {
		await copyFile(join(SRC, f), join(OUT, f));
		copied++;
	}
	console.log(`copied ${copied} pdfjs-viewer-element assets to ${OUT}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
