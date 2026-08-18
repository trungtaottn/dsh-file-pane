# Feature Comparison: dsh-file-pane vs dsh-multiroot-workspace (reference)
## Source: Blackoutta/dsh-multiroot-workspace @0.1.0-rc.1 (npm, published 2026-08-15)
## Local Project: dsh-file-pane @0.2.0 (trungtaottn/dsh-file-pane)

_Timestamp: 2026-08-17 12:42 · Mode: --compare_

## 1. Recon

**Source manifest:**
- Repo: https://github.com/Blackoutta/dsh-multiroot-workspace (npm `dsh-multiroot-workspace@0.1.0-rc.1`)
- Target: DSH `0.1.0-rc.6` chính xác (peer deps: `@deepseek-ai/cordis@4.0.1`, `dsh-client-*@0.1.0-rc.6`,
  `react@18.3.1`, `schemastery@3.18.1`, `zod@4`)
- Layout: `index.js` (641L host), `tools.js` (462L), `client.js` (4151L pre-built), `cordis.patch.yml`,
  browser E2E (playwright + temp profile), CI.

**Local map:**
- dsh-file-pane: `lib/index.js` (172L host), `lib/view-core.mjs` (314L core), `lib/view-html.mjs`
  (401L renderer), `client/index.tsx` (229L client-plugin), `lib/client.js` pre-built, `cordis.patch.yml`,
  19 tests (host guards + bundle contract + diff), CI node 22/24.

## 2. Map — dependency matrix (source → local)

| Source component | Mục đích | Local equivalent | Status |
|---|---|---|---|
| `webServer.register({kind:'prefix', path:'/plugins/multiroot/api'...})` | HTTP API | `webServer.register({kind:'prefix', path:'/browser'...})` | EXISTS (cùng pattern) |
| `storageDomain` + `defineDomain` (tables: workspaces/derived/session_roots) | Durable state | — (spill RAM-only) | NEW (chỉ khi cần durable) |
| `workspaceRegistry` service (host) | Workspace entities | — (hardcode workspaceRoot) | NEW (chưa cần — env config đủ) |
| Client slots `conversation.hero.workspace` + `sidebar.workspaces` | In-app workspace UI | `conversation.chat.turnTail` (chips) | CONFLICT (slot khác nhau — không đụng) |
| `__ModuleLoader__.load({id, factory})` bundle | Browser plugin wire | giống hệt (build-client.mjs) | EXISTS |
| `dsh.client.inject` service list | Boot safety | giống hệt (5 services) | EXISTS |
| Tools family (`ws_*`) + system-prompt section | Model-facing workspace ops | — | NEW (ngoài scope viewer) |
| Config-declared roots (`config.roots` trong patch) | Deployment config | `workspaceRoot` trong patch | EXISTS (đơn giản hơn) |
| Browser E2E (playwright, temp profile, screenshots) | Verify UI | smoke + bundle contract (node) | NEW (nice-to-have) |

## 3. Analyze — điểm đáng học (và điểm KHÔNG nên copy)

### Đáng học (áp dụng cho v0.3+)
1. **Config-declared qua patch + env**: multiroot nhận `roots` từ patch config; chúng ta có thể nhận
   `workspaceRoot` từ `!!js process.env.DSH_FILE_PANE_ROOT ?? process.env.HOME` — cùng triết lý
   "deployment-declared config", chi phí ~0.
2. **`resolveByPath` / canonicalize**: multiroot canonical hóa path (`realpath`) trước khi so — chúng
   ta đã có `resolveWithin` (realpath + guard), giữ nguyên; chỉ thêm nhánh `path.isAbsolute` →
   `path.relative(root, abs)`.
3. **Session-cwd anchor**: multiroot dùng `session.header.cwd` làm primary root; client-plugin của
   chúng ta có `sessions.list.current.cwd` — dùng nó để dựng abs path khi mở chip (giải path-mapping).
4. **Router shape**: `{ ok, value } | { ok, error }` + `cache-control: no-store` + disposer qua
   `ctx.effect` — chuẩn đáng copy cho mọi API mới (nếu thêm).
5. **Verify pyramid**: typecheck → build → unit → `--dump-config` → headless → web temp profile →
   browser E2E. Chúng ta đang ở bậc 3-5; bổ sung `--dump-config` check cho env patch là đủ cho v0.3.

### KHÔNG nên copy (v0.3)
1. **storageDomain persistence**: spill hiện RAM-only cố ý (session-scoped, không đĩa) — durable là
   thay đổi thiết kế, không cần cho viewer read-only.
2. **workspaceRegistry + multi-root UI**: quá tầm; abs-path normalize giải quyết 99% case path-mapping
   với 5 dòng core.
3. **Tools family (ws_*)**: viewer read-only không mở model-facing tools.
4. **Client UI phức tạp (hero/sidebar picker)**: v0.3 không làm in-app UI; chỉ giữ chips.

## 4. Challenge — 5 câu hỏi

| # | Câu hỏi | Source answer | Local answer | Rủi ro nếu sai |
|---|---|---|---|---|
| 1 | Path gốc từ đâu? | workspaceRegistry + session cwd | workspaceRoot (config/env) + abs normalize | Mở sai file khi cwd ≠ root → fix bằng abs-from-cwd |
| 2 | State có durable không? | storageDomain (đĩa, migration versioned) | RAM spill (session-scoped) | Diff mất khi restart — chấp nhận (thiết kế cũ) |
| 3 | UI nằm đâu? | in-app slots (hero/sidebar) | route HTML + chips | Trải nghiệm kém hơn in-app nhưng upgrade-safe |
| 4 | Model có dùng được không? | tools + system-prompt | không (chỉ user xem) | Không — viewer không cần model |
| 5 | Config qua đâu? | patch `roots` (deployment-declared) | env + patch (v0.3), settings UI (tương lai) | Env không đủ cho multi-instance → patch vẫn override được |

## 5. Decision matrix

| Decision | Source's way | Our way | Recommendation |
|---|---|---|---|
| Config source | patch `roots` + storageDomain | patch `workspaceRoot` + env `!!js` | Prefer local (đơn giản, đủ) |
| Path resolution | workspaceRegistry.resolveByPath | resolveWithin + abs→rel normalize | Prefer local core (đã security-guarded) |
| Persistence | storageDomain durable | RAM spill | Prefer local (viewer read-only) |
| UI mount | in-app slots | host route HTML + chips | Prefer local cho v0.3; revisit v0.4 |
| Bundle protocol | `__ModuleLoader__` + inject services | giống hệt | Keep (đã đúng chuẩn) |
| Config UI | in-app picker | env/patch (Settings row optional) | Prefer env (KISS) |

## Recommendation
Port **3 pattern nhỏ** (không transplant code): (a) env-config qua patch `!!js`, (b) session-cwd →
abs path khi mở deliverable, (c) `--dump-config` verify bậc thang. Không port storageDomain,
workspaceRegistry, tools, hay in-app UI. Chi tiết: `plans/research/260817-1242-expand-research.md`.

## Unresolved Questions
1. Có cần Settings UI row (settings.general.item) cho workspaceRoot thay vì env? (env đủ theo KISS)
2. Có muốn port browser E2E (playwright + temp profile) cho v0.3 hay chỉ test node?
