# Feature Comparison: dsh-file-pane vs dsh-better-sidebar-lite (reference)
## Source: pixellover1433/dsh-better-sidebar-lite @7219fc8 (main, v0.1.0)
## Local Project: dsh-file-pane @6cb6f2d (v0.1.0, squash)
## Mode: --compare

_Timestamp: 2026-08-18 10:05_

## 1. Recon

**Source manifest:**
- Repo: https://github.com/pixellover1433/dsh-better-sidebar-lite (PUBLIC, SHA `7219fc8`)
- Target DSH: v0.1.0-rc.7+ per README (v0.0.2-beta.*), RESTRICTED: rc.5..rc.7+ noted; **devDeps link sibling `../deepseek-harness`**
- Layout: `src/{contract,host,client}` TS + tsconfig dual-program + vitest (jsdom client tests) + oxlint + docs/{adr,design,agent-prompts,review} + README 183L.
- Bundle: `scripts/build-client-bundle.mjs` — esbuild + **lightningcss for CSS Modules** + inline-import, `lib/client.js` `__ModuleLoader__.load`.

**Local map:**
- dsh-file-pane: `lib/index.js` (host: /browser route + spill API + vendor pdfjs), `lib/view-core.mjs` (security/diff/markdown core), `lib/view-html.mjs` (server-rendered HTML pane), `lib/docx.mjs`, `client/index.tsx` (client-plugin: produced chips → /browser + diff spill), 34 tests, esbuild-only build.

## 2. Map — dependency matrix

| Source component | Mục đích | Local equivalent | Status |
|---|---|---|---|
| Slot `details` (right column, priority -1 shadow DetailsPanel) | Dock in-app chiếm cột phải AppFrame | — (dùng route HTML ngoài frame) | **NEW — seam đã có trong rc.6 (`renderSlot("details")`)** |
| `ctx.layout.openDetails()/closeDetails()` | Điều khiển column | — | **NEW — API có trong rc.6 (openDetails/closeDetails verified)** |
| Tab registry (`ctx.betterSidebar.tabs`) | Extensible tabs | — | NEW (nice-to-have) |
| RPC channel `/better-sidebar` (`connection.rpc.handle`, authority **loopback**) | Data host→client | `/browser` HTTP route + `/browser/api/spill` | **CONFLICT — authority loopback: KHÔNG chạy remote; local dùng HTTP (remote-safe)** |
| Host services Explorer/Git (fs/promises + git spawn fixed-args) | fs/git data | view-core (resolveWithin/readFileResult) | EXISTS (khác scope: họ git, ta read-only) |
| CSS Modules + lightningcss + <style data-plugin> | Styling client | Inline `<style>` trong JSX component (dshfp-*) | CONFLICT — giữ pattern inline (không cần build CSS) |
| `inject` bundle-export là nguồn thật (`dsh.client.inject` chỉ metadata) | Boot safety | export const inject trong client/index.tsx | EXISTS (đúng như local, đã làm) |
| Settings namespace + card (settingsScope) | User config live | env `DSH_FILE_PANE_ROOT` (patch) | NEW (optional; README ghi card cần rc.7 — verify rc.6) |
| Floating dock fallback (ResizeObserver width) | Column đóng → dock nổi | — | NEW (họ xử lý kỹ) |
| Locale en/zh qua ctx.locale | i18n | có (produced.label en/zh) | EXISTS |

## 3. Analyze — vì sao họ hiện pane TRONG UI được

Chuỗi mount (đã trace source):
```
ui-layout AppFrame (rc.6) khai báo slot 'details' (kind single, scope session)
  → client plugin: ctx.slots.inject('details', () => ctx.slots.register({name:'details', priority:-1}, DockEntry))
  → priority -1 SHADOW ui-conversation's DetailsPanel (tool details) — 1 người ngồi 1 ghế
  → AppFrame grid: sidebar | conversation | details — cột details chiếm chỗ THẬT (conversation co lại, không overlap)
  → DetailsColumn giữ subtree mount ở width 0 khi đóng; gate session non-blank + viewport rộng
  → dock tự theo dõi width cột (ResizeObserver) → khi cột đóng mà dock mở → render absolute nổi 320px
  → open/close qua ctx.layout.openDetails()/closeDetails(); toggle Ctrl/Cmd+Shift+B + footer button
```

**Điểm khác biệt quyết định với local:**
1. Họ dùng **slot details trong frame**, không render page riêng — trải nghiệm in-app, conversation + pane cùng màn hình.
2. Data qua **RPC channel `authority: loopback`** — chỉ hoạt động khi browser đồng origin loopback/trusted. Plugin local TARGET REMOTE (từ thiết bị khác) → RPC loopback **không dùng được**.
3. Local đã có **HTTP route `/browser` hoạt động remote** (fetch cùng origin qua Cloudflare harness.nes.codes) — không cần RPC: dock UI chỉ cần `fetch('/browser/api/...')`/`?path=` để lấy dữ liệu.

→ **Kết luận analyze:** port **dock mount pattern** (details slot + layout actions + floating fallback) GIỮ NGUYÊN data channel HTTP hiện tại. Không port RPC, không port git, không port CSS modules.

## 4. Challenge — 5 câu hỏi

| # | Câu hỏi | Source answer | Local answer | Rủi ro nếu sai |
|---|---|---|---|---|
| 1 | Cột details có hoạt động remote không? | Có (slot client-side, không phụ thuộc authority) | Cần verify live rc.6 thật (corpus có renderSlot("details") + gate) | Mount được nhưng layout gate ẩn cột → fallback floating |
| 2 | Data channel nào? | RPC loopback | HTTP /browser (fetch), remote-safe, đã chạy production | Chọn RPC → break remote; giữ HTTP là an toàn |
| 3 | Có nên thay thế route HTML bằng dock hoàn toàn? | Họ không có route | Giữ CẢ HAI: route deep-link/raw + dock in-app shell | Bỏ route → mất share/raw/bookmark |
| 4 | CSS style thế nào? | CSS Modules + lightningcss build phức tạp | Inline <style> trong bundle (pattern hiện tại) | Build DB mới tốn công, upgrade-fragile hơn |
| 5 | Diff + docx preview trong dock? | Họ không có diff | Client render lại view-core logic (diff/markdown/docx) trong React | Phải port renderer server→client — tốn công |

## 5. Decision matrix

| Decision | Source's way | Our way | Recommendation |
|---|---|---|---|
| Mount điểm | slot `details` | slot `details` (cùng seam) | **Port** — đây là giá trị cốt lõi của repo này |
| Data transport | RPC loopback | HTTP /browser fetch | **Giữ local** (remote-safe) |
| UI render | React + CSS Modules | React + inline style | Giữ inline style (KISS) |
| Page route | không có | /browser route | Giữ nguyên (deep-link + raw + fallback) |
| Preview pipeline | không có | view-core server render | Port view-core logic sang client khi cần preview trong dock |
| Settings | settingsScope card | env + patch | Env đủ; settings card để sau |

## Recommendation
Port **dock-in-app** cho dsh-file-pane: client-plugin thêm `layout` vào inject, đăng ký slot `details` priority -1, render pane React (file tree + file view + diff) tái sử dụng `view-core` logic, data qua `fetch('/browser/...')`. RPC loopback KHÔNG port (target remote). Chi tiết brainstorm: `plans/reports/260818-1005-brainstorm-inapp-dock.md`.

## Unresolved Questions
1. Cột details gate có chặn khi không có session đang mở không? (AppFrame gate non-blank session → dock floating fallback có xử lý)
2. settingsScope card có hoạt động rc.6 không (README họ ghi cần rc.7)?
3. Diff spill RAM có nên chuyển sang fetch GET khi dock render không (cùng endpoint)?