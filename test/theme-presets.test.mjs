/**
 * Theme preset map contract tests.
 *
 * Each preset (except "DSH default") must carry accent / background / foreground
 * token overrides for BOTH light and dark schemes, keyed on the real
 * `--dsw-alias-*` token names the DSH theme package exposes. This guards the
 * hand-authored token constants (the whole point of the read-mostly theme
 * switcher) against typos and role omissions.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PRESET, PRESETS, presetIds } from "./theme-dist/theme-presets.js";

// The six roles every non-default preset must cover, accented/bg/fg identity.
const REQUIRED_TOKENS = [
  "--dsw-alias-state-business-primary", // accent
  "--dsw-alias-brand-primary",           // buttons/focus accent
  "--dsw-alias-bg-base",                 // base background
  "--dsw-alias-bg-layer-1",              // raised surface
  "--dsw-alias-label-primary",            // primary foreground
  "--dsw-alias-border-l2"                 // border
];

test("PRESETS is non-empty and default preset is a no-op layer", () => {
  assert.ok(Object.keys(PRESETS).length >= 3, "expected at least 3 presets");
  assert.equal(PRESETS[DEFAULT_PRESET].id, DEFAULT_PRESET);
  assert.deepEqual(PRESETS[DEFAULT_PRESET].tokens, {});
});

test("presetIds is stable, lists dsh-default first, and matches PRESETS keys", () => {
  const ids = presetIds();
  assert.ok(ids.length >= 3);
  assert.equal(ids[0], DEFAULT_PRESET);
  assert.deepEqual(ids, Object.keys(PRESETS));
});

for (const id of presetIds()) {
  if (id === DEFAULT_PRESET) continue;
  test(`preset ${id} defines light+dark required roles`, () => {
    const p = PRESETS[id];
    assert.ok(p, `missing preset ${id}`);
    assert.equal(typeof p.label, "string");
    assert.ok(p.tokens && typeof p.tokens === "object", "tokens map present");
    for (const tok of REQUIRED_TOKENS) {
      const mode = p.tokens[tok];
      assert.ok(mode, `${id} missing token ${tok}`);
      assert.ok(mode && typeof mode === "object", `${tok} is a {light,dark} pair`);
      assert.ok(typeof mode.light === "string" && mode.light.length > 0, `${tok}.light a non-empty string`);
      assert.ok(typeof mode.dark === "string" && mode.dark.length > 0, `${tok}.dark a non-empty string`);
    }
  });

  test(`preset ${id} values are css-color-literal safe (no tags/injection)`, () => {
    const p = PRESETS[id];
    for (const mode of Object.values(p.tokens)) {
      for (const v of [mode.light, mode.dark]) {
        assert.ok(!/[<>{}"]/.test(v), `token value ${v} must be a raw css color literal`);
      }
    }
  });
}