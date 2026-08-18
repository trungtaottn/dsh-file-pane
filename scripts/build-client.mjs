/**
 * dsh-file-pane — client-plugin bundle builder.
 *
 * Compiles `client/index.tsx` into the DSH client-plugin wire format:
 *
 *   window.__ModuleLoader__.load({ id, factory: (require) => {...} })
 *
 * Platform modules (react, react/jsx-runtime, cordis, ...) are kept EXTERNAL —
 * the DSH shell's static module table plugs them in at load time, and the
 * browser module loader forbids bundling them. Any other local imports get
 * inlined by esbuild.
 *
 * Output: lib/client.js (used by exports["./client"]), served by the DSH
 * client-modules host at /plugins/dsh-file-pane/client.js.
 */
import { build } from "esbuild";
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "lib", "client.js");
const TMP = join(ROOT, "lib", ".client.raw.js");

// Seeded browser modules (see dsh-client-web getStaticModules) — must stay
// external so each bundle shares the same instance and cross-plugin bundles
// can't be value-imported.
const EXTERNAL = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-web-react",
  "@deepseek-ai/dsh-client-ui-primitives",
  "@deepseek-ai/dsh-client-ui-attachment",
  "@deepseek-ai/dsh-client-schema-form"
];

const PKG = JSON.parse(execSync(`node -e "console.log(JSON.stringify(require('${join(ROOT, "package.json")}')))"`, { cwd: ROOT }).toString());

async function main() {
  await build({
    entryPoints: [join(ROOT, "client", "index.tsx")],
    outfile: TMP,
    bundle: true,
    platform: "browser",
    format: "cjs",
    target: "es2020",
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    external: EXTERNAL,
    logLevel: "info"
  });
  const body = await readFile(TMP, "utf8");
  const wrapped = [
    "window.__ModuleLoader__.load({",
    `\tid: ${JSON.stringify(PKG.name)},`,
    "\tfactory: (require) => {",
    "\t\tvar module = { exports: {} };",
    "\t\tvar exports = module.exports;",
    body,
    "\t\treturn module.exports;",
    "\t}",
    "});"
  ].join("\n");
  await writeFile(OUT, wrapped + "\n");
  await rm(TMP, { force: true });
  console.log(`built ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
