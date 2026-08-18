/**
 * dsh-file-pane — semantic-release configuration.
 *
 * Release model:
 *   - main  → stable channel (latest) — published as 0.x.y
 *   - dev   → pre-release channel (beta) — published as 0.x.y-beta.N
 *
 * Versions come from conventional-commit analysis of the squash history;
 * `npm publish` runs under NPM_TOKEN (repo secret), GitHub release + changelog
 * assets under GITHUB_TOKEN (auto-provided by Actions).
 */
export default {
  branches: [
    "main",
    { name: "dev", prerelease: "beta", channel: "beta" }
  ],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    "@semantic-release/github"
  ]
};