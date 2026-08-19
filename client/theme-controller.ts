/**
 * dsh-file-pane — theme controller over DSH's native ThemeRuntime.
 *
 * A tiny ownership layer over `ctx.theme` that applies/deletes a single live
 * token override layer (`source = "dsh-file-pane"`) with zero residue, and
 * resolves the initial preset id from config + localStorage.
 *
 * The real DSH `ThemeRuntime` (from `@deepseek-ai/dsh-client-ui-theme`) is:
 *   - `getTheme(): ThemeSnapshot`  (`snapshot.active.colorScheme` = 'light'|'dark')
 *   - `overrideTokens(source, tokens): () => void`  returns the layer disposer
 *   - the `theme/change` event is emitted on the **cordis ctx** (`ctx.on`), not
 *     on the theme object — so the controller takes an optional `emitter`
 *     (`ctx`) to observe it.
 *
 * `overrideTokens` takes a per-scheme token layer as
 * `Record<string, { light, dark }>`, composes it over the active base palette,
 * and always re-emits `theme/change` with a text-scheme-correct snapshot
 * (each token resolves to `modes[active.colorScheme]`). Consequently a
 * light/dark UI flip needs NO re-apply from us — the retained override layer
 * recomposes automatically. Re-applying inside our `theme/change` listener
 * would therefore be both redundant AND an infinite loop
 * (apply → overrideTokens → emit 'theme/change' → apply → …), so we subscribe
 * only for lifecycle/dispose parity, never to re-apply.
 *
 * This file is pure (no DOM, no React) and testable with a mock ThemeRuntime +
 * a mock emitter.
 */
import { PRESETS, DEFAULT_PRESET, presetIds } from "./theme-presets";
import type { ThemeTokenOverrides } from "./theme-presets";

/** Minimal structural view of the theme snapshot the controller consumes. */
export interface ThemeSnapshotLike {
  active?: { colorScheme?: "light" | "dark" };
}

/** Minimal structural view of DSH's ThemeRuntime (see index.d.ts). */
export interface ThemeRuntimeLike {
  getTheme(): ThemeSnapshotLike;
  overrideTokens(source: string, tokens: ThemeTokenOverrides): () => void;
}

/** Minimal cordis-context-shaped event emitter (`ctx`). */
export interface ThemeEmitterLike {
  on(event: string, handler: (snapshot: unknown) => void): () => void;
}

export interface CreateThemeControllerOptions {
  /** Persisted-preset reader (e.g. localStorage). Used by the mount seed. */
  load?: () => string | null;
  /** Event emitter with `ctx.on` — the `theme/change` source. Optional. */
  emitter?: ThemeEmitterLike;
}

export interface ThemeController {
  /** Apply a preset id. `dsh-default` or unknown ids clear the override. */
  apply(id: string): void;
  /** Remove the live override layer, restoring DSH's built-in palette. */
  clear(): void;
  /** Clear the layer and unsubscribe from `theme/change`. Idempotent. */
  dispose(): void;
  /** The currently applied preset id, or `null` when none (built-in). */
  active(): string | null;
}

/**
 * Resolve the initial preset id with the documented precedence:
 *   persisted (localStorage) > configured `themePreset` > DEFAULT_PRESET.
 * Invalid values at any level fall back to the next source, ending at
 * `dsh-default`. Pure + exported for tests.
 */
export function resolveInitialPreset(cfg: unknown, persisted: string | null): string {
  const ids = presetIds();
  if (typeof persisted === "string" && ids.includes(persisted)) return persisted;
  const fromCfg =
    cfg != null && typeof cfg === "object" && typeof (cfg as Record<string, unknown>).themePreset === "string"
      ? ((cfg as Record<string, unknown>).themePreset as string)
      : null;
  if (fromCfg && ids.includes(fromCfg)) return fromCfg;
  return DEFAULT_PRESET;
}

/** Build a theme controller bound to a ThemeRuntime. */
export function createThemeController(
  theme: ThemeRuntimeLike,
  opts: CreateThemeControllerOptions = {}
): ThemeController {
  const emitter = opts.emitter;
  let layer: (() => void) | null = null;
  let activeId: string | null = null;
  let offChange: (() => void) | null = null;
  let disposed = false;

  // Observe theme/change for lifecycle/dispose parity. See the file header for
  // why we do NOT re-apply here (auto-composition + infinite-loop avoidance).
  if (emitter && typeof emitter.on === "function") {
    try {
      offChange = emitter.on("theme/change", () => {
        /* retained override layer recomposes per active color scheme already */
      });
    } catch {
      offChange = null;
    }
  }

  function clear(): void {
    if (layer) {
      const d = layer;
      layer = null;
      d();
    }
    activeId = null;
  }

  function apply(id: string): void {
    if (id === DEFAULT_PRESET || !Object.prototype.hasOwnProperty.call(PRESETS, id)) {
      clear();
      return;
    }
    clear();
    activeId = id;
    layer = theme.overrideTokens("dsh-file-pane", PRESETS[id].tokens);
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    clear();
    if (offChange) {
      offChange();
      offChange = null;
    }
  }

  return { apply, clear, dispose, active: () => activeId };
}