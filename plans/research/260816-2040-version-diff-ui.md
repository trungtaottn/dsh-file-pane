# Research Report: Version diff "trước → sau" cho dsh-file-pane (Kiểu 1)

_Timestamp: 2025 (research từ DSH repo corpus `0.1.0-rc.6` + live system)_

## Executive Summary

Kiểu 1 (xem file thay đổi gì giữa các phiên bản khi agent sửa) **khả thi** với
nguồn "bản trước" **lấy trực tiếp từ chính thao tác sửa của agent** (đã chốt hướng A):
- DSH lộ hunk `{ path, oldText, newText }` (trước → sau) trong **tool event view** của
  mutation tools (`card:"diff"`); client-plugin nghe `tool/result` đọc được chúng.
- Root workspace `/home/kaynt` **không phải git repo** → git-diff (hướng B) chỉ hợp lệ cho
  dự án con, không bao phủ toàn workspace → loại.
- Snapshot riêng (hướng C) cần hook "trước khi sửa" mà DSH chưa có seam tin cậy → loại.
- Cần **bridge client→host**: client-plugin nhận hunk → POST tới route host-plugin
  (cùng origin) → host lưu spill (bản cũ + bản mới) → route `/browser/?path=...&diff=1`
  đọc spill và render cạnh nhau. Đã xác minh `webServer.register` nhận **mọi HTTP method**
  nên POST route khả thi.

UI đề xuất: **side-by-side 2 cột** (OLD trái | NEW phải) với đánh dấu dòng thay đổi,
line numbers, header path + thống kê +/-/file; tuân theo token màu pane hiện có
(`--bg #0f1117`, `--panel #161a23`, `--accent #4f8cff`, mono font). Có thể thêm toggle
sang unified nếu muốn — mặc định side-by-side.

## Research Methodology

- Nguồn: `dsh-client-ui-tool` (DiffBlock/narrowDiffs/diffCardModel), `dsh-client-ui-deliverables`
  (event subscription mẫu), `dsh-host-webserver` (register API), `dsh-client-ui-primitives`
  (DiffBlock render), codebase dsh-file-pane (theme/route), live DSH.
- web_search online fail (thiếu `DEEPSEEK_API_KEY`) → corpus + live là nguồn chính.
- Mục: xác định nguồn dữ liệu "trước→sau", điểm hook, bridge client→host, và chuẩn UI.

## Key Findings

### 1. Nguồn "bản trước" — DSH đã nắm trước→sau của agent

- `DiffHunk = { path, oldText: string|null, newText: string }` (dsh-client-ui-primitives,
  `DiffBlock.d.ts`). `oldText=null` = file mới; `newText` = sau khi sửa.
- Nguồn: tool **event view** (`card:"diff"`), client projection:
  - `diffCardModel(block)` đọc `call.diffs` (đang chạy) rồi `result.diffs` (settled,
    authoritative — "an edit's real before/after").
  - `narrowDiffs` validate: hunk phải `{ path: string, oldText: string|null, newText: string }`.
- Client-plugin có thể đọc: deliverables làm mẫu — `conversationEvents.register(definition)`
  với `match` trên `tool/call` + `tool/result` (`isAppendSurfaceEvent`), lấy `match.view?.for === "call"
  ? match.view.view` → `.diffs`. **Khả thi hoàn toàn.**

### 2. Bridge client→host (spill) — khả thi

- Client-plugin chạy trong browser **cùng origin** với DSH → `fetch('/browser/api/spill',
  { method:'POST', body: JSON.stringify({path, oldText, newText, ts}) })`.
- `dsh-host-webserver.register({kind:'prefix', path:'/browser', handler})` — handler sở hữu
  toàn bộ response lifecycle, **không giới hạn GET** (đã đọc source: không có method filter).
- Host plugin hiện chỉ xử lý GET; cần thêm nhánh POST `path=/api/spill` (hoặc route riêng)
  → lưu vào Map + spill dir. Kế thừa security core: validate path trong root.

### 3. Render "trước → sau" trong pane

- Route hiện tại: `readFileResult(root, rel)` đọc file **hiện tại**. Với `&diff=1`,
  cần đọc spill (bản cũ + mới) thay vì (hoặc bên cạnh) file hiện tại.
- Dữ liệu để render: `{ path, old, new }` từ spill; nếu không có spill → fallback:
  so sánh file hiện tại với spill cũ nhất còn lưu, hoặc báo "chưa có bản trước".
- View: side-by-side 2 pane OLD/NEW + header (path, +a -r, N file) + line numbers.

### 4. UI diff — chuẩn nội bộ DSH vs side-by-side

- DSH nội bộ dùng **unified**: `DiffBlock` (path header, `-` del, `+` add, `⋯` gap, footer
  `+a -r · N file`). Đã có sẵn trong chat; không cần tái tạo trong chat.
- Pane nên cung cấp **thứ chat không có**: toàn-cảnh trước→sau cạnh nhau (2 cột) với:
  - Cột OLD: dòng bị xóa đánh nền đỏ nhạt + `-`; cột NEW: dòng thêm nền xanh nhạt + `+`.
  - Dòng không đổi: cùng nội dung 2 cột (căn thẳng), muted.
  - Line numbers 2 cột độc lập (vì số dòng OLD ≠ NEW).
  - Header: `path`, thống kê `+added -removed · N file`, nút toggle unified (tùy chọn),
    nút copy diff text, nút raw.
- Token màu theo theme pane hiện tại (dark):
  - `--del-bg: rgba(255,80,80,.12)`, `--del-fg:#ff7b72`
  - `--add-bg: rgba(63,185,80,.12)`, `--add-fg:#7ee787`
  - đường gutter + marker `│` ở giữa 2 cột.
- Responsive: dưới ~720px, chuyển side-by-side thành **stacked** (OLD trên, NEW dưới)
  để tránh 2 cột quá hẹp (như GitHub mobile diff).

### 5. Spill storage

- **Đĩa** (khuyến nghị): thư mục `{root}/.dsh-file-pane-spill/` với `{hash}.json`
  (`{path, old, new, ts, session}`), giữ N bản mới nhất / TTL; xem lại sau restart.
  - Rủi ro: rác file; cần cleanup + `.gitignore`-like exclusion; không vượt root guard.
- RAM (in-memory Map): nhanh, hết khi restart; đủ cho phiên hiện tại.

## Comparative Analysis

| Hướng | Nguồn bản trước | Bao phủ | Độ bền | Chi phí |
|---|---|---|---|---|
| **A. Từ thao tác agent (chốt)** | tool result hunk | Mọi file (kể cả ngoài git) | Tốt (client-plugin event, đã có seam) | Trung bình (cần spill bridge) |
| B. Git diff | git HEAD | Chỉ dự án con có git | Tốt | Thấp nhưng không phủ root |
| C. Snapshot plugin | tự chụp trước sửa | Mọi file | Kém (chưa có hook "trước sửa") | Cao |

## Implementation Recommendations

### Kiến trúc đề xuất (A + spill đĩa + side-by-side)

```mermaid
flowchart LR
  A[Client-plugin nghe tool/result] -->|result.diffs hunks| B[POST /browser/api/spill]
  B --> C[Host: lưu spill <root>/.dsh-file-pane-spill/*.json]
  C --> D[GET /browser/?path=X&diff=1]
  D --> E[view-html: side-by-side OLD|NEW + header/thống kê]
```

1. **Host (`lib/index.js`)**:
   - Nhánh POST `/browser/api/spill` (validate path trong root, body JSON `{path, old, new, ts}`)
     → ghi `{root}/.dsh-file-pane-spill/{sha1(path)}.json` (atomic write tmp+rename).
   - Route GET: nếu `diff=1` → đọc spill + file hiện tại → `view-html.paneDiffHTML({path, old, new, ...})`.
   - Cleanup: giữ tối đa N spill/file; xóa khi file xóa.
2. **Client-plugin (`client/index.tsx`)**:
   - Thêm `conversationEvents.register(diffSpillDefinition)` lắng nghe `tool/result`:
     khi `result.diffs` có hunk → `fetch('/browser/api/spill', POST)` (fire-and-forget,
     không chặn UI; lỗi silent).
   - Chỉ spill khi remote? Không — spill hữu ích cả loopback (xem lại sau); nhưng để
     tránh spam, spill mọi nơi, giới hạn kích thước hunk (vd old/new ≤ 256KB).
3. **UI (`view-html.mjs`)**: `paneDiffHTML` side-by-side, token màu trên, responsive
   stacked dưới 720px, copy-diff button.

### Quick Start (scope tối thiểu)
1. Host: POST spill + GET `diff=1` đọc spill, render side-by-side cơ bản (không toggle).
2. Client: đăng ký diffSpillDefinition, POST hunks.
3. Test: unit (spill route guard, render diff), manual (agent sửa file → bấm "xem diff"
   → pane side-by-side).

### Common Pitfalls
- **Path mapping**: hunk `path` là workspace-relative theo session cwd; spill phải lưu
  theo cùng base với `?path=` của pane → đồng bộ `workspaceRoot` như Kiểu 2.
- **oldText=null** (file mới): side-by-side vẫn hiển thị (cột OLD trống + thông báo "file mới").
- **Hunk lớn**: cap kích thước; render theo hàng giới hạn + "truncated" như text hiện tại.
- **Cleanup spill**: tránh rác file tích tụ; TTL/giới hạn số lượng.
- **POST chưa từng có trong route**: đảm bảo không phá GET cũ (tách nhánh method rõ).

## Resources & References
- `dsh-client-ui-primitives/lib/types/DiffBlock.d.ts` — DiffHunk shape, DEFAULT_DIFF_MAX_LINES.
- `dsh-client-ui-tool/lib/types/client/tool/models/diff-card-model.d.ts` — call/result diffs.
- `dsh-client-ui-tool/lib/client.js` (narrowDiffs, diffCardModel) — validate hunk.
- `dsh-client-ui-deliverables/lib/client.js` — mẫu `conversationEvents.register` + đọc tool view.
- `dsh-host-webserver/lib/index.js` — register() nhận mọi method; prefix route.
- `dsh-file-pane/lib/*` — theme token, route, security core (resolveWithin).

## Unresolved Questions
1. UI mặc định **side-by-side** (đề xuất) hay **unified**? (chờ anh chốt bằng text)
2. Spill lưu **đĩa** (bền, xem lại sau restart) hay **RAM** (đơn giản)? (đề xuất đĩa)
3. Có cần toggle unified↔side-by-side trong pane không?
4. Kích thước hunk tối đa / số bản spill giữ lại / TTL?

## Next Steps
- Chốt 3 câu hỏi trên bằng text.
- Implement theo kiến trúc đề xuất (host spill + client subscribe + side-by-side UI).
- Test + verify live DSH.
