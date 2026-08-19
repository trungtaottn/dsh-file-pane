/**
 * dsh-file-pane — handcrafted theme preset token maps.
 *
 * Pure data module (no DOM, no `ctx`, no React) so it can be unit-tested
 * directly. Presets are `--dsw-alias-*` token overrides applied through DSH's
 * native `ctx.theme.overrideTokens(source, tokens)`.
 *
 * Token-layer shape (verified against the installed
 * `@deepseek-ai/dsh-client-ui-theme` package):
 *
 *   `ThemeTokenOverrides = Record<string, { light: string; dark: string }>`
 *
 * i.e. each token name maps to a `{ light, dark }` value pair — NOT a
 * `{ light: {...tokens}, dark: {...tokens} }` split. `overrideTokens`'s
 * runtime validator (`validateOverrides`) requires the per-token pair and
 * throws a teaching TypeError on a bare string or a per-scheme object split.
 * Both modes are mandatory per token; repeat the value when a role is
 * scheme-invariant. The override layer composes over the active base palette
 * with per-token wins by layer sequence, and the presenter picks
 * `modes[active.colorScheme]` automatically — so a light/dark UI flip needs no
 * re-apply from us.
 *
 * Every key below is a real alias token that exists in
 * `styles/design-platform.css` (light `body` block ~line 156, dark
 * `body[data-ds-dark-theme]` ~line 248). Note: the plan draft referenced
 * `--dsw-alias-bg-raised`, `--dsw-alias-bg-elevated`,
 * `--dsw-alias-state-business-active`/`-hover` — those do NOT exist in this
 * DSH release. The real background-surface roles are `--dsw-alias-bg-layer-1/2/3`
 * and the real accent role is `--dsw-alias-state-business-primary` (with
 * `--dsw-alias-brand-primary` driving primary buttons/focus). This file is
 * keyed ONLY on verified names.
 */

/** Per-token modes: both palettes are mandatory (mirrors the theme package). */
export interface ThemeTokenModes {
  light: string;
  dark: string;
}

/** Override-layer dictionary: token name → `{ light, dark }` pair. */
export type ThemeTokenOverrides = Record<string, ThemeTokenModes>;

/** One selectable theme preset. */
export interface ThemePreset {
  id: string;
  label: string;
  /** Optional Chinese label for zh locale pickers. */
  labelZh?: string;
  /** Alias-token overrides; empty for the "DSH default" (no-op) preset. */
  tokens: ThemeTokenOverrides;
}

/** "DSH default": applying it clears the override layer (no injection). */
export const DEFAULT_PRESET = "dsh-default";

/**
 * The four handcrafted presets. `dsh-default` is `{}` (a no-op layer) so the
 * controller maps it to `clear()` — DSH's built-in palette shines through.
 */
export const PRESETS: Record<string, ThemePreset> = {
  "dsh-default": {
    id: "dsh-default",
    label: "DSH default",
    labelZh: "默认",
    tokens: {}
  },
  "deepseek-blue": {
    id: "deepseek-blue",
    label: "Deepseek Blue",
    labelZh: "深海蓝",
    // DSH-native neutrals with the dock's existing #5b96ff-family accent pinned
    // so the dock and the surrounding web UI agree on the blue identity.
    tokens: {
      "--dsw-alias-state-business-primary": { light: "#5b96ff", dark: "#7aa8ff" },
      "--dsw-alias-brand-primary": { light: "#4a7ef0", dark: "#8db4ff" },
      "--dsw-alias-state-business-tertiary": { light: "#d9e6ff", dark: "#2b3a5e" },
      "--dsw-alias-bg-base": { light: "#ffffff", dark: "#0f1117" },
      "--dsw-alias-bg-layer-1": { light: "#f5f6f8", dark: "#1b1b1c" },
      "--dsw-alias-bg-layer-2": { light: "#edf0f4", dark: "#232324" },
      "--dsw-alias-label-primary": { light: "#14161f", dark: "#eef1f8" },
      "--dsw-alias-label-secondary": { light: "#586174", dark: "#c7ccd9" },
      "--dsw-alias-label-tertiary": { light: "#8790a1", dark: "#9aa3b5" },
      "--dsw-alias-border-l2": { light: "rgba(10,14,30,.09)", dark: "rgba(255,255,255,.12)" },
      "--dsw-alias-border-l3": { light: "rgba(10,14,30,.12)", dark: "rgba(255,255,255,.16)" }
    }
  },
  nord: {
    id: "nord",
    label: "Nord",
    labelZh: "北欧蓝",
    // Cool slate background, muted fg, cyan/teal accent (classic Nord).
    tokens: {
      "--dsw-alias-state-business-primary": { light: "#2f88a6", dark: "#88c0d0" },
      "--dsw-alias-brand-primary": { light: "#2f88a6", dark: "#88c0d0" },
      "--dsw-alias-state-business-tertiary": { light: "#d6e7ee", dark: "#38485f" },
      "--dsw-alias-bg-base": { light: "#eceff4", dark: "#2e3440" },
      "--dsw-alias-bg-layer-1": { light: "#e5e9f0", dark: "#3b4252" },
      "--dsw-alias-bg-layer-2": { light: "#d8dee9", dark: "#434c5e" },
      "--dsw-alias-label-primary": { light: "#2e3440", dark: "#eceff4" },
      "--dsw-alias-label-secondary": { light: "#4c566a", dark: "#d8dee9" },
      "--dsw-alias-label-tertiary": { light: "#7e8ca0", dark: "#8f9bb0" },
      "--dsw-alias-border-l2": { light: "rgba(46,52,64,.12)", dark: "rgba(216,222,233,.14)" },
      "--dsw-alias-border-l3": { light: "rgba(46,52,64,.15)", dark: "rgba(216,222,233,.18)" }
    }
  },
  "codex-warm": {
    id: "codex-warm",
    label: "Codex Warm",
    labelZh: "暖纸色",
    // Warm brown/tan background, cream fg, amber/orange accent.
    tokens: {
      "--dsw-alias-state-business-primary": { light: "#b45309", dark: "#f59e0b" },
      "--dsw-alias-brand-primary": { light: "#c06a1a", dark: "#f0a03c" },
      "--dsw-alias-state-business-tertiary": { light: "#f3dfc2", dark: "#4a3a2c" },
      "--dsw-alias-bg-base": { light: "#f8f2e7", dark: "#241a16" },
      "--dsw-alias-bg-layer-1": { light: "#f0e7d6", dark: "#32251e" },
      "--dsw-alias-bg-layer-2": { light: "#e6d9c4", dark: "#3e2f25" },
      "--dsw-alias-label-primary": { light: "#2b2118", dark: "#f5e9d8" },
      "--dsw-alias-label-secondary": { light: "#5d4b36", dark: "#ccb9a4" },
      "--dsw-alias-label-tertiary": { light: "#8d765c", dark: "#a08d77" },
      "--dsw-alias-border-l2": { light: "rgba(60,43,26,.12)", dark: "rgba(245,233,216,.12)" },
      "--dsw-alias-border-l3": { light: "rgba(60,43,26,.15)", dark: "rgba(245,233,216,.16)" }
    }
  }
};

/** Stable, ordered list of selectable preset ids (`dsh-default` first). */
export function presetIds(): string[] {
  return Object.keys(PRESETS);
}