# Example: using dsh-file-pane from the DSH agent

After the plugin is installed and the web service restarted, the DSH agent can
point the user at a file to review on a remote device without a download.

1. Agent produces/edits a file in the workspace root, e.g. `./reports/retro.md`.
2. Agent tells the user (who is on a remote device):
   > Open the file view: `https://<dsh-host>/browser/?path=reports/retro.md`
   > (or `/browser/` to browse the workspace).
3. The user reads it inline in the pane and can `copy` the path or open `raw`.

To make an agent auto-print this URL for deliverables, add a note to your agent
instructions (e.g. under `~/.dsh/profiles/web/cordis.patch.yml`'s persona/skill
layer or a project `SKILL.md`):

```
When you finish a file deliverable and the user is remote, also report the
dsh-file-pane URL: /browser/?path=<relative-or-absolute-within-root>
```
