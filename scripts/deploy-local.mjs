/**
 * dsh-file-pane — deploy-local.
 *
 * Syncs the local `web` production profile to the latest published BETA release
 * of dsh-file-pane from the GitHub registry (pre-release tag, not stable).
 *
 * The `web` profile is the production DSH surface (port 3080). We intentionally
 * run it from a packed tarball release (not a `link:` to the workspace) so that
 * checking out feature branches in the workspace NEVER changes what production
 * serves — production is pinned to a released beta, development happens freely
 * in the workspace and is previewed on a separate profile/port (see
 * preview-branch.mjs and AGENTS.md).
 *
 * Behavior:
 *   1. Query GitHub for the newest pre-release (beta) of this repo.
 *   2. Read the beta version currently installed in the web profile.
 *   3. If the released beta is newer, download its tarball and install it into
 *      the web profile (replacing the dependency), then print a restart hint.
 *   4. If already up to date, print that and touch nothing.
 *
 * We deliberately do NOT auto-restart: restarting `deepseek-harness-web` mid-
 * session drops the work you have open, so this script stages the install and
 * leaves the restart to you (or to an explicit `--restart` flag).
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const requireLocal = createRequire(join(ROOT, "package.json"));

const REPO = "trungtaottn/dsh-file-pane";
const PROFILE = process.env.DSH_FILE_PANE_PROFILE || "web";
const PROFILE_DIR = join(process.env.HOME, ".dsh", "profiles", PROFILE);
const RESTART = process.argv.includes("--restart");

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8", ...opts }).trim();
}

/** Newest pre-release (beta) tag via gh, or null. */
function latestBetaTag() {
  try {
    const out = sh(`gh api repos/${REPO}/releases --paginate --jq '[.[] | select(.prerelease==true) | .tag_name] | .[0]'`);
    return out || null;
  } catch { return null; }
}

/** Version string currently installed in the profile (from node_modules pkg). */
function installedVersion(profileDir) {
  const pkgPath = join(profileDir, "node_modules", "dsh-file-pane", "package.json");
  if (!existsSync(pkgPath)) return null;
  try { return requireLocal(pkgPath).version; } catch { return null; }
}

/** Install the tarball for `tag` into the profile dir. */
function installTarball(profileDir, tag) {
  // Persist the tarball under a stable cache dir (not /tmp) so the recorded
  // dependency path never points at something deleted; then install from file.
  const cacheDir = join(process.env.HOME, ".dsh", "tarballs");
  if (!existsSync(cacheDir)) execSync(`mkdir -p "${cacheDir}"`);
  const tgz = join(cacheDir, `dsh-file-pane-${tag.slice(1)}.tgz`);
  const url = `https://github.com/${REPO}/releases/download/${tag}/${tgz.split(/[\\/]/).pop()}`;
  if (!existsSync(tgz)) {
    console.log(`Downloading ${url}`);
    sh(`curl -fsSL "${url}" -o "${tgz}"`);
  } else {
    console.log(`Using cached ${tgz.split(/[\\/]/).pop()}`);
  }
  sh(`NODE_OPTIONS= pnpm add "file:${tgz}"`, { cwd: profileDir });
  console.log(`Installed ${tag} into profile "${PROFILE}"`);
}

function main() {
  const tag = latestBetaTag();
  if (!tag) { console.log("No beta release found on GitHub — nothing to do."); return; }
  const betaVersion = tag.slice(1); // v0.2.0-beta.1 -> 0.2.0-beta.1
  const installed = installedVersion(PROFILE_DIR);

  console.log(`Latest beta on GitHub: ${tag} | installed in "${PROFILE}": ${installed ?? "(none)"}`);

  if (installed === betaVersion) {
    console.log("Already up to date.");
    return;
  }
  if (!existsSync(PROFILE_DIR)) {
    console.error(`Profile "${PROFILE}" not found at ${PROFILE_DIR}`);
    process.exit(1);
  }

  installTarball(PROFILE_DIR, tag);
  console.log(`\nStaged beta ${tag} in profile "${PROFILE}".`);
  if (RESTART) {
    sh("sudo -n systemctl restart deepseek-harness-web");
    console.log("Restarted deepseek-harness-web.");
  } else {
    console.log(`Restart when ready:\n  sudo -n systemctl restart deepseek-harness-web\n(or re-run with --restart to do it now).`);
  }
}

main();
