import { chromium } from "playwright-core";
const URL = process.argv[2];
const execPath = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`;
const browser = await chromium.launch({ executablePath: execPath });
const page = await browser.newPage({ viewport: { width: 520, height: 640 } });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(()=>{});
await page.waitForTimeout(1000);
const m = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { scrollW: el.scrollWidth, cliW: el.clientWidth, oX: getComputedStyle(el).overflowX, w: Math.round(r.width), left: Math.round(r.left) };
  };
  return {
    body: pick("body"), main: pick(".main"), archive: pick(".archive"), diffwrap: pick(".diffwrap"), diffgrid: pick(".diffgrid"),
    clippedCode: (() => { const c = document.querySelector(".code"); if(!c) return null; const cr = c.getBoundingClientRect(); return { codeRight: Math.round(cr.right), bodyRight: Math.round(document.body.getBoundingClientRect().right), overflowsBody: cr.right > document.body.getBoundingClientRect().right }; })()
  };
});
console.log(JSON.stringify(m, null, 2));
await browser.close();
