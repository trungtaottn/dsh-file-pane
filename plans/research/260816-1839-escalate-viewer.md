# Research Report: Mở file trực tiếp từ session/deliverable cho dsh-file-pane

_Timestamp: 2025 (session research từ corpus DSH repo `0.1.0-rc.6` + codebase hiện tại)_

## Executive Summary

Nghiên cứu xác định phần việc tiếp theo **khả thi nhất** trong handoff:
**mở file từ deliverable/session (kiểu 2 — click deliverable tự mở viewer `/browser`)**
là khả thi về mặt kỹ thuật nhưng **không làm được bằng cách override service thông thường**;
cần shipping một **client-plugin** riêng (pre-built `lib/client.js` + `dsh.client.platform:"web"`
+ row trỏ package trong `cordis.patch.yml`), chèn qua **slot `conversation.chat.turnTail`**
hoặc **DOM capture** trên `[data-produced-files-row]`.

Kiểu 1 (diff trước→sau) là đích dài hạn hơn: chat **đã render** diff before/after trong
`FileMutationRow` (qua `diffCardModel`); để phủ lên pane cần nguồn snapshot/git diff.
Khuyên: làm **trước kiểu 2** (trả giá trị remote đọc file ngay), rồi kiểu 1 như phase 2.

`web_search` online **fail** (thiếu `DEEPSEEK_API_KEY` — đúng cảnh báo trong handoff).
Toàn bộ research đi từ **repo corpus DSH** (`/usr/local/lib/node_modules/@deepseek-ai/dsh`) —
đây là nguồn có thẩm quyền (chính các package đang chạy).

## Research Methodology

- Nguồn: repo DSH installed (`@deepseek-ai/dsh@0.1.0-rc.6`) + codebase `dsh-file-pane` + trạng thái live (`/browser/` 200, test 6/6 pass).
- Mục: xác định **điểm can thiệp** & **ràng buộc seam** cho 2 kiểu feature.
- Phạm vi: `dsh-client-ui-deliverables`, `dsh-client-ui-conversation`, `dsh-client-connection`, `dsh-client-runtime`, `dsh-client-modules`, `dsh-host-frontend-static`, `dsh-host-webserver`, `dsh-client-ui-tool`, `cordis`.

## Key Findings

### 1. Cơ chế client-plugin (browser roster) — MỞ cho user plugin

`dsh-client-modules` host half (`lib/index.js`) **quét mọi Loader entry đang live**:
- Với mỗi entry có package `package.json` khai `dsh.client.platform === "web"` **và** `exports["./client"]` → đăng ký thành browser plugin, serve `/plugins/<id>/client.js`, và nhét graph vào `window.__DSH_BOOT__` qua index tap.
- **Không phân biệt shipped-vs-user**: user bundle trong `dsh.profile.bundles` hoặc `cordis.patch.yml` thêm 1 row trỏ package có client half là đủ (ghi chú patch `dsh-web-app/cordis.patch.yml`: *"`dsh.client` rows are the browser roster the modules node half scans into `window.__DSH_BOOT__`"*).
- Ràng buộc: cần **web-bundle pre-build** (file `lib/client.js` tồn tại lúc serve; thiếu → lỗi `MissingClientBundleError` với "run `pnpm run build`").
- **Kết luận:** seam `dsh.client` hoạt động cho user, nhưng "upgrade-fragile" là vì **bundle phải pre-build trước khi restart** và plugin-set đổi qua cache `pkgMeta` **chỉ có hiệu lực sau restart**.

### 2. Kiểu 2 — điểm can thiệp deliverable

Chuỗi hiện tại (đã xác minh trong source):
```
chip Produced → openFile(path) [ProducedFiles, dsh-client-ui-deliverables]
  → ChatView.inject.openFile [dsh-client-ui-conversation ~L9731]
  → workspaces.openPath(resolveWorkspacePath(cwd, path))  [dsh-client-runtime]
  → api.host.openPath()  → mở trên OS host (loopback) — vô dụng khi remote
```
- `isLoopback` gating: `canOpenPath = isLoopback && hostDescription.canOpenPath` — trên browser remote `isLoopback=false`, nên chíp "show in folder" bị ẩn; nhưng **`onClick` chíp vẫn gọi `openFile`** (host-OS) dù remote.
- `resolveWorkspacePath(cwd, path)` cho **absolute path** (gốc = workspace cwd `sessions[].cwd`), không phải relative → **mismatch base** với pane route (hiện `workspaceRoot=/home/kaynt`). Cần đồng bộ base hoặc tính relative.

**Rào cản override service** (quan trọng — bác bỏ phương án "đơn giản re-provide"):
- cordis `provide(name,...)` **throw** nếu service đã được đăng ký bởi fiber khác (`lib/index.js` cordis). `chatFileMentions` và `workspaces` đã do deliverables/runtime cung cấp → **không re-provide được**.
- `openFile` là **closure capture** tại inject, không phải service tra cứu động → không patch gián tiếp qua service.

**Các lối khả thi cho kiểu 2:**
- **A (khuyên): client-plugin register vào slot `conversation.chat.turnTail`** — render thêm/ưu tiên một produced-files row tuỳ biến có chíp `navigate('/browser/?path=...')`. Slot là điểm mở rộng thiết kế (deliverables tự dùng `ctx.slots.inject("conversation.chat.turnTail", ...)`).
- **B (lighter): capture-phase DOM listener** trên `[data-produced-files-row] ::button` → `preventDefault` + `location.href = '/browser/?path=...'`. Không cần slot, nhưng bám DOM (upgrade-fragile như handoff cảnh báo).
- **C (host-side thuần, không client-plugin):** thêm route `/browser/deliverable?path=<abs>` chuẩn hoá path base; chỉ hữu ích nếu có client-plugin bấm — nên coi là phần đệm chứ không tự giải quyết.

### 3. Kiểu 1 — diff trước→sau

- Chat **đã có** diff before/after: `FileMutationRow` render `diffCardModel` (hunks từ `locations`) và **cũng gọi `openFile`** trên link path — nên 1 client-plugin cũng có thể đổi hành vi link này.
- Muốn diff toàn file ở pane cần **nguồn bản cũ**:
  - (c) **git diff** nếu workspace là git repo: route `?path=...&diff=1&vs=<rev>` render old→new. Ưu: bản gốc do git giữ, đúng "before". Khuyết: workspace không phải git thì bỏ sót; dùng `git` binary/`simple-git`.
  - (d) **snapshot/spill**: plugin host snapshot bản cũ trước khi agent sửa (watch, không có seam agent-hook tin cậy để biết "trước sửa") — khó chốt thời điểm; trừ khi đọc từ tool result của `FileMutationRow` (hunks local).
- Khuyên: kiểu 1 **phase 2**, ưu tiên (c) git nếu workspace git; ghi R&D về snapshot cho non-git.

### 4. Ràng buộc path-mapping (cả 2 kiểu)

Deliverable path relative theo **workspace cwd**; pane route theo **workspaceRoot config**. Hiện `cordis.patch.yml` hardcode `/home/kaynt` (handoff ghi nhận "config workspaceRoot qua env/settings"). Nên:
- Cấu hình `workspaceRoot` linh hoạt (env `DSH_FILE_PANE_ROOT` + settings), **hoặc**
- Client-plugin tính relative bằng cách so path với `sessions.list` cwd (runtime cung cấp `useSessions`).

## Comparative Analysis

| Phương án kiểu 2 | Chi phí | Độ bền | Ghi chú |
|---|---|---|---|
| A. Slot turnTail client-plugin | Cao (build client bundle) | Tốt (slot là API) | Đúng sản phẩm "in-app" |
| B. DOM capture | Thấp | Kém (bám DOM, upgrade-fragile) | POC nhanh |
| C. Route base-đệm (host) | Thấp | Tốt | Không tự mở được, chỉ là hạ tầng |

## Implementation Recommendations

### Quick Start Scope (gợi ý — chờ brainstorm chốt)
1. **Phase 0 (hạ tầng đồng bộ path):** config `workspaceRoot` đọc env/settings; thêm route chuẩn hoá abs→rel.
2. **Phase 1 (kiểu 2 bản nhẹ):** POC client-plugin DOM-capture (B) hoặc slot A cho produced-file chips → `/browser/?path=`.
3. **Phase 2 (kiểu 1):** pane mode `?diff=1&vs=<rev>` git-based; snapshot cho non-git.
4. Tái dùng `lib/view-core.mjs` cho mọi mount — core/route giữ nguyên.

### Common Pitfalls
- Re-provide `chatFileMentions`/`workspaces` → cordis throw (đã xác minh).
- Quên pre-build `lib/client.js` trước restart → `MissingClientBundleError`.
- Path base mismatch (cwd workspace vs workspaceRoot `/home/kaynt`) → path sai khi mở deliverable.
- Không restart sau khi đổi bundle-set → cache `pkgMeta` giữ danh sách plugin cũ.

## Resources & References (offline corpus)

- `dsh-client-modules/lib/index.js` — browser-roster scan + __DSH_BOOT__ injection (mấu chốt seam).
- `dsh-web-app/cordis.patch.yml` — "dsh.client rows are the browser roster".
- `dsh-client-ui-deliverables/lib/client.js` — chip onClick→openFile, canOpenPath isLoopback gating.
- `dsh-client-ui-conversation/lib/client.js` L9731 — openFile closure→workspaces.openPath.
- `dsh-client-runtime/lib/client.js` — resolveWorkspacePath, openPath host RPC.
- `dsh-host-frontend-static`, `dsh-host-webserver` — index taps / fallback seat.
- cordis `lib/index.js` — provide re-registration throw.
- `dsh-client-ui-tool/.../file-mutation-row*` + `diff-card-model.d.ts` — kiểu 1 before/after source.

## Unresolved Questions
1. Nên cấu hình `workspaceRoot` theo env/settings/convention nào để khớp path deliverable (workspace cwd) — cần brainstorm chốt.
2. Kiểu 2: chọn **slot A** (chắc, tốn build) hay **DOM capture B** (POC nhanh, fragile)?
3. Kiểu 1: workspace của anh có dùng git repo không? (quyết định hướng git-diff vs snapshot).
4. Có muốn publish npm + `.code-workspace` trước khi thêm máy in-app không?

## Next Steps (hành động gợi ý)
- Chốt bộ 4-field brainstorm contract (Outcome/Constraints/Non-goals/Acceptance).
- Chọn kiểu 2 hướng A hoặc B rồi `/ak-cook` phase tương ứng.
