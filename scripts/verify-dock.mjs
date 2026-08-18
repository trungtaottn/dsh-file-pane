// Verify the dsh-file-pane dock boots + renders on a running DSH sandbox.
// Usage: NODE_OPTIONS= node scripts/verify-dock.mjs <url> [selectorWaitMs]
import { chromium } from "playwright-core";

const URL = process.argv[2] || "http://127.0.0.1:3090/";
const WAIT = parseInt(process.argv[3] || "8000", 10);
const SHELL = process.env.SHELL_PATH;
const execPath = SHELL || `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`;

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({ executablePath: execPath });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => pageErrors.push(String(e)));

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch((e) => pageErrors.push("goto: " + e));
await page.waitForTimeout(WAIT);

const result = await page.evaluate(() => {
  const boot = (window.__DSH_BOOT__ && Object.keys(window.__DSH_BOOT__)) || [];
  const dock = document.querySelector('[data-dsh-file-pane-dock="1"]');
  const produced = document.querySelector('[data-dsh-file-pane-produced="1"]');
  const toggle = document.querySelector('[data-dsh-file-pane-toggle="1"]');
  const overlaySlots = [...document.querySelectorAll('[data-shell-overlay], .pI_x6G_overlayLayer')].length;
  return {
    bootKeys: boot,
    dockPresent: !!dock,
    dockRect: dock ? dock.getBoundingClientRect().toJSON() : null,
    producedPresent: !!produced,
    togglePresent: !!toggle,
    overlayLayers: overlaySlots,
    bodyTextStart: (document.body.innerText || "").slice(0, 120)
  };
});

console.log(JSON.stringify({ result, consoleErrors, pageErrors }, null, 2));
await browser.close();
