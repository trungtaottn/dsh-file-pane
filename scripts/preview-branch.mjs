/**
 * dsh-file-pane — preview-branch.
 *
 * Runs a SECOND, isolated DSH instance from the CURRENT workspace on port 3091
 * using the dedicated `preview` profile. This lets you inspect a feature branch
 * you are actively developing WITHOUT touching the production `web` profile
 * (which is pinned to a released beta tarball — see deploy-local.mjs).
 *
 * Usage:
 *   # workspace is already on the feature branch you want to see
 *   cd ~/Code/dsh-file-pane                # adjust to your checkout path
 *   git checkout feat/my-feature        # switch workspace to the feature
 *   node scripts/preview-branch.mjs     # boot :3091 from the workspace
 *
 *   # stop it:
 *   node scripts/preview-branch.mjs --stop   # (or Ctrl+C / kill the pid)
 *
 * The `preview` profile links dsh-file-pane to THIS workspace, so whatever
 * branch is checked out is what :3091 serves — production stays untouched.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PROFILE = join(process.env.HOME, ".dsh", "profiles", "preview");
const PORT = process.env.DSH_FILE_PANE_PREVIEW_PORT || "3091";
const PIDFILE = join(process.env.HOME, ".dsh", "dsh-file-pane-preview.pid");

function ensureProfile() {
  const pkg = join(PROFILE, "package.json");
  if (existsSync(pkg)) return;
  mkdirSync(PROFILE, { recursive: true });
  const manifest = {
    name: "dsh-profile-preview",
    private: true,
    dependencies: { "dsh-file-pane": `link:${ROOT}` },
    dsh: { profile: { bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-file-pane"] } }
  };
  writeFileSync(pkg, JSON.stringify(manifest, null, 2));
  writeFileSync(join(PROFILE, "pnpm-workspace.yaml"), "packages:\n  - .\nnodeLinker: hoisted\nautoInstallPeers: false\n");
  writeFileSync(join(PROFILE, "cordis.yml"), "[]\n");
  writeFileSync(join(PROFILE, "cordis.patch.yml"), "[]\n");
  // silent helper: run pnpm install so the preview profile resolves the link
  try {
    require("child_process").execSync("NODE_OPTIONS= pnpm install", { cwd: PROFILE, stdio: ["ignore", "inherit", "inherit"] });
  } catch (e) { /* first boot may need install; surfaced via dsh error */ }
}

function currentBranch() {
  try {
    return require("child_process")
      .execSync("git branch --show-current", { cwd: ROOT, encoding: "utf8" }).trim() || "(detached)";
  } catch { return "(unknown)"; }
}

function stopExisting() {
  if (!existsSync(PIDFILE)) return false;
  const pid = readFileSync(PIDFILE, "utf8").trim();
  try { process.kill(Number(pid), "SIGTERM"); console.log(`Stopped preview (pid ${pid}).`); writeFileSync(PIDFILE, ""); return true; }
  catch { writeFileSync(PIDFILE, ""); return false; }
}

function main() {
  if (process.argv.includes("--stop")) { stopExisting(); return; }
  stopExisting(); // don't leave a stale preview running
  if (!existsSync(process.env.HOME + "/.dsh/profiles/preview")) {
    ensureProfile();
  }
  const branch = currentBranch();
  console.log(`Previewing workspace branch "${branch}" on port ${PORT}`);
  // rc.8: the web server is a subcommand — `dsh web --profile preview` (NOT
  // `dsh --profile preview -- --port`). Without `web` cordis boots the
  // non-HTTP default app and never binds a port (silent no-op boot).
  const trusted = process.env.DSH_FILE_PANE_TRUSTED_HOST
    ? ["--trusted-host", process.env.DSH_FILE_PANE_TRUSTED_HOST]
    : [];
  // The preview profile's bundles (incl. @deepseek-ai/dsh-web-app) make it a web
  // app, so `dsh --profile preview` directly exposes the web flags (see
  // `dsh --profile preview --help`). Pass --port/--no-open as app options — do
  // NOT add the `web` subcommand (it is an alias hardcoded to the profile named
  // "web") and do NOT use `--` (it would swallow --port, falling back to the
  // default 3080 which production already holds → EADDRINUSE, silent no-boot).
  const child = spawn("dsh", ["--profile", "preview", "--port", PORT, "--no-open", ...trusted], {
    cwd: ROOT, stdio: "inherit", env: { ...process.env, NODE_OPTIONS: "" }
  });
  writeFileSync(PIDFILE, String(child.pid));
  child.on("exit", () => { try { writeFileSync(PIDFILE, ""); } catch {} });
  console.log(`Open http://127.0.0.1:${PORT} || stop with: node scripts/preview-branch.mjs --stop`);
}

main();
