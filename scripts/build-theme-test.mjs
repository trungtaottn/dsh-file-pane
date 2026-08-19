/**
 * dsh-file-pane — minimal esbuild transform for the theme unit tests.
 *
 * `node --test` cannot import `client/*.ts` directly, so this bundles the two
 * pure theme modules into plain ESM `.mjs` under `test/theme-dist/` that the
 * test files import. Kept dependency-light (reuses the repo's esbuild devDep);
 * deliberately not ts-node/ts-jest.
 */
import { build } from "esbuild";
import { readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, "test", "theme-dist");

async function main() {
  // Clear stale outputs first (idempotent rebuilds).
  try { await rm(OUT_DIR, { recursive: true, force: true }); } catch { /* ignore */ }

  await build({
    entryPoints: [
      join(ROOT, "client", "theme-presets.ts"),
      join(ROOT, "client", "theme-controller.ts")
    ],
    outdir: OUT_DIR,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    logLevel: "info"
  });

  const files = await readdir(OUT_DIR);
  if (files.length === 0) throw new Error("theme test bundle produced no output");
  console.log(`built ${files.length} theme test module(s) into ${OUT_DIR}`);
}

main().catch((err) => { console.error(err); process.exit(1); });