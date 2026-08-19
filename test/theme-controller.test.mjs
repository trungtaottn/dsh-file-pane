/**
 * Theme controller contract tests using a mock ThemeRuntime.
 *
 * The controller owns a single live `overrideTokens('dsh-file-pane', tokens)`
 * layer with zero residue: applying replaces the previous layer (disposing it),
 * applying `dsh-default`/unknown clears without injecting, and dispose removes
 * the layer + unsubscribes `theme/change`. Also covers `resolveInitialPreset`
 * precedence (persisted wins > configured > default).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createThemeController, resolveInitialPreset } from "./theme-dist/theme-controller.js";
import { DEFAULT_PRESET, PRESETS } from "./theme-dist/theme-presets.js";

/** A mock ThemeRuntime recording calls, returning a disposer per layer. */
function makeMockTheme() {
  const calls = []; // { source, tokens }
  const disposers = [];
  return {
    calls,
    disposers,
    theme: {
      getTheme: () => ({ active: { colorScheme: "dark" } }),
      overrideTokens(source, tokens) {
        calls.push({ source, tokens });
        let disposed = false;
        const d = () => { disposed = true; };
        disposers.push({ d, disposed: () => disposed });
        return d;
      }
    }
  };
}

test("resolveInitialPreset precedence (persisted > config > default)", () => {
  // persisted known wins
  assert.equal(resolveInitialPreset({ themePreset: "nord" }, "codex-warm"), "codex-warm");
  // persisted absent -> configured known
  assert.equal(resolveInitialPreset({ themePreset: "nord" }, null), "nord");
  // persisted invalid -> configured known
  assert.equal(resolveInitialPreset({ themePreset: "nord" }, "not-a-preset"), "nord");
  // configured invalid + no persisted -> default
  assert.equal(resolveInitialPreset({ themePreset: "bad" }, null), DEFAULT_PRESET);
  // both invalid -> default
  assert.equal(resolveInitialPreset({ themePreset: "bad" }, "also-bad"), DEFAULT_PRESET);
  // nil config -> persisted, else default
  assert.equal(resolveInitialPreset(undefined, "deepseek-blue"), "deepseek-blue");
  assert.equal(resolveInitialPreset(undefined, null), DEFAULT_PRESET);
});

test("apply('deepseek-blue') calls overrideTokens with source id + preset tokens", () => {
  const { theme, calls } = makeMockTheme();
  const c = createThemeController(theme);
  c.apply("deepseek-blue");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].source, "dsh-file-pane");
  assert.deepEqual(calls[0].tokens, PRESETS["deepseek-blue"].tokens);
  assert.equal(c.active(), "deepseek-blue");
});

test("apply('dsh-default') clears without calling overrideTokens", () => {
  const { theme, calls } = makeMockTheme();
  const c = createThemeController(theme);
  c.apply("deepseek-blue");
  c.apply(DEFAULT_PRESET);
  // No NEW layer call for the default; first is from deepseek-blue.
  assert.equal(calls.length, 1);
  assert.equal(c.active(), null);
});

test("unknown preset id clears (acts like default)", () => {
  const { theme, calls } = makeMockTheme();
  const c = createThemeController(theme);
  c.apply("deepseek-blue");
  c.apply("nope-unknown");
  assert.equal(calls.length, 1, "unknown id must not inject a layer");
  assert.equal(c.active(), null);
});

test("second apply disposes the previous layer (zero residue)", () => {
  const { theme, disposers } = makeMockTheme();
  const c = createThemeController(theme);
  c.apply("nord");
  c.apply("codex-warm");
  assert.equal(disposers.length, 2);
  assert.equal(disposers[0].disposed(), true, "previous layer disposed");
  assert.equal(disposers[1].disposed(), false, "active layer not disposed");
});

test("clear() disposes the active layer and nulls the id", () => {
  const { theme, disposers } = makeMockTheme();
  const c = createThemeController(theme);
  c.apply("nord");
  c.clear();
  assert.equal(disposers[0].disposed(), true);
  assert.equal(c.active(), null);
});

test("dispose() clears the layer and unsubscribes theme/change", () => {
  let unsubscribed = false;
  const { theme, disposers } = makeMockTheme();
  const emitter = { on(event, h) { assert.equal(event, "theme/change"); return () => { unsubscribed = true; }; } };
  const c = createThemeController(theme, { emitter });
  c.apply("nord");
  c.dispose();
  assert.equal(disposers[0].disposed(), true);
  assert.equal(unsubscribed, true);
  // dispose is idempotent
  c.dispose();
});