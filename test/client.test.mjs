import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Client-plugin bundle contract tests.
 *
 * The DSH web shell loads each client-plugin via `window.__ModuleLoader__.load
 * ({ id, factory })`. The factory returns the module namespace (via
 * `module.exports`), which `unwrapExports` consumes as the plugin (`apply`,
 * `name`). We validate that contract here, plus the produced-file derivation
 * and the chain selector that make the "remote produced-file → pane" feature
 * work.
 */
test("client bundle registers via __ModuleLoader__ with the plugin's id", () => {
  let captured = null;
  const prev = globalThis.window;
  globalThis.window = { __ModuleLoader__: { load: (spec) => (captured = spec) } };
  try {
    const code = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
    // The bundle only calls load(); evaluate it.
    new Function(code)();
  } finally {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  }
  assert.ok(captured, "expected module loader called");
  assert.equal(captured.id, "dsh-file-pane");
});

test("client bundle factory returns a plugin contract (name/inject/apply)", () => {
  let captured = null;
  const prev = globalThis.window;
  globalThis.window = { __ModuleLoader__: { load: (spec) => (captured = spec) } };
  try {
    const code = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
    new Function(code)();
  } finally {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  }
  const factory = captured.factory;
  const fakeRequire = (id) => {
    if (id === "react") return { createElement: () => null, Fragment: {} };
    throw new Error("unexpected require: " + id);
  };
  const out = factory(fakeRequire);
  assert.equal(out.name, "dsh-file-pane");
  assert.equal(typeof out.apply, "function");
  assert.equal(typeof out.producedForClosing, "function");
  assert.equal(typeof out.selectProducedPane, "function");
  // The fiber must wait for the services `apply` touches — without this the
  // plugin can activate before slots/locale/connection exist and crash the
  // whole web boot ("Failed to load plugins: dsh-file-pane").
  for (const svc of ["slots", "locale", "connection", "conversationEvents", "sessions"]) {
    assert.ok(out.inject.includes(svc), `plugin must declare service ${svc}`);
  }
});

test("apply waits for its services via inject (boot-safety regression)", () => {
  // Regression: the bundle used to export NO `inject`, so the cordis fiber
  // could activate before slots/locale/connection were provided and `apply`
  // threw — the web shell then failed the whole boot with a
  // "Failed to load plugins: dsh-file-pane" screen. The inject list is what
  // makes the loader wait; guard it here so a rebuild can't drop it.
  let captured = null;
  const prev = globalThis.window;
  globalThis.window = { __ModuleLoader__: { load: (spec) => (captured = spec) } };
  try {
    const code = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
    new Function(code)();
  } finally {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  }
  const { apply, inject } = captured.factory(() => ({ createElement: () => null, Fragment: {} }));
  for (const svc of ["slots", "locale", "connection", "conversationEvents", "sessions", "layout"]) {
    assert.ok(inject.includes(svc), `plugin must declare service ${svc}`);
  }

  // Without the declared services the plugin must NOT be callable (its apply
  // assumes they exist) — the loader enforces this by inject-waiting. Calling
  // apply with a bare ctx should throw, proving the plugin is not silently
  // activatable without its seats (missing layout fails loudly first).
  assert.throws(() => apply({ get: () => undefined }), /ctx\.layout missing|isLoopback|slots|register/);

  // And it must work once the services are provided (the loader order).
  // The real ctx exposes declared services as direct properties (ctx.locale,
  // ctx.slots, ...) — mirror that here.
  const calls = { inject: 0, register: 0, locale: 0, events: 0 };
  const slots = {
    inject: (_key, cb) => { calls.inject++; cb(); return () => {}; },
    register: (_opts, _comp) => { calls.register++; return () => {}; }
  };
  const locale = { register: (_ns, _dict) => { calls.locale++; }, bind: () => (() => {}) };
  const conversationEvents = { register: (_def) => { calls.events++; return () => {}; } };
  const sessions = { list: { getSnapshot: () => ({ current: "S1" }) } };
  const ctx = {
    slots,
    locale,
    conversationEvents,
    connection: { isLoopback: false },
    layout: { openDetails() {}, closeDetails() {} },
    get: (name) => ({ slots, locale, conversationEvents, connection: { isLoopback: false }, sessions, layout: ctx.layout })[name],
    effect: (cb) => { cb(); return () => {}; }
  };
  apply(ctx);
  // two chain entries (turnTail + details) + one footer action slot
  assert.equal(calls.inject, 3);
  assert.equal(calls.register, 3);
  assert.equal(calls.locale, 1);
  assert.equal(calls.events, 1);
});

test("producedForClosing dedupes and filters by closing seq", () => {
  let captured = null;
  const prev = globalThis.window;
  globalThis.window = { __ModuleLoader__: { load: (spec) => (captured = spec) } };
  try {
    const code = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
    new Function(code)();
  } finally {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  }
  const { producedForClosing } = captured.factory(() => ({ createElement: () => null, Fragment: {} }));
  assert.deepEqual(
    producedForClosing(
      { produced: [{ seq: 5, path: "a.md" }, { seq: 5, path: "a.md" }, { seq: 9, path: "b.md" }] },
      7
    ),
    ["a.md"] // seq 9 dropped; duplicate a.md kept once
  );
  assert.deepEqual(producedForClosing(undefined), []);
});

test("select runs for remote, declines on loopback", () => {
  let captured = null;
  const prev = globalThis.window;
  globalThis.window = { __ModuleLoader__: { load: (spec) => (captured = spec) } };
  try {
    const code = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
    new Function(code)();
  } finally {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  }
  const { selectProducedPane } = captured.factory(() => ({ createElement: () => null, Fragment: {} }));
  const owner = {
    turn: { data: new Map([["deliverables", { produced: [{ seq: 1, path: "x.ts" }] }]]) },
    seq: 3
  };
  // Remote: claims the chain and returns the produced path.
  assert.deepEqual(selectProducedPane(false)(owner), ["x.ts"]);
  // Loopback: declines so the built-in Host-open row stays in charge.
  assert.equal(selectProducedPane(true)(owner), null);
  // Remote, nothing produced: declines.
  const empty = { turn: { data: new Map([["deliverables", { produced: [] }]]) }, seq: 1 };
  assert.equal(selectProducedPane(false)(empty), null);
});
