/**
 * dsh-file-pane — semantic-release configuration.
 *
 * Release model:
 *   - main  → stable channel (latest) — tagged v0.x.y, GitHub Release only
 *   - dev   → pre-release channel (beta) — tagged v0.x.y-beta.N
 *
 * npm publishing is DISABLED (npmPublish: false): the @semantic-release/npm
 * plugin is kept only for its prepare step (bumps package.json + creates the
 * git tag) and skips the npm registry entirely — no NPM_TOKEN needed. Releases
 * are created on GitHub by @semantic-release/github, and the packed tarball
 * can be installed straight from the release (see README).
 */
export default {
  branches: [
    "main",
    { name: "dev", prerelease: "beta", channel: "beta" }
  ],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    // npmPublish:false + tarballDir:"dist" — bumps package.json + creates the
    // git tag, keeps the packed tarball in dist/, and never touches npm. The
    // tarball is then attached to the GitHub Release by the github plugin.
    ["@semantic-release/npm", { npmPublish: false, tarballDir: "dist" }],
    // Attach the packed tarball (written to dist/ by the npm plugin) to the
    // GitHub Release so the plugin can be installed straight from it.
    ["@semantic-release/github", { assets: ["dist/*.tgz"] }]
  ]
};