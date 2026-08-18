# Brainstorm: dsh-file-pane — in-app dock (pane trong UI) qua slot `details`

_Timestamp: 2026-08-18 10:05 · Dựa trên xia compare `plans/reports/260818-1005-xia-better-sidebar-compare.md` + corpus rc.6_

## Brainstorm contract

### Outcome
Mở rộng dsh-file-pane với **in-app dock**: file pane render ngay trong DSH web UI (cột `details`
bên phải, conversation co lại bên cạnh, không rời trang) — giữ nguyên route `/browser` làm
deep-link/raw/fallback. Remote (non-loopback) là target chính — KHÔNG phụ thuộc RPC loopback.

### Constraints
- **Seam chuẩn rc.6**: slot `details` (đã exists, `renderSlot("details")` trong ui-layout), 
  `ctx.layout.openDetails()/closeDetails()` (verified rc.6), `sessions`/`slots`/`locale`/`layout` services.
- **Data channel = HTTP `/browser` hiện tại** (fetch cùng origin, remote-safe qua Cloudflare) — KHÔNG port
  RPC `authority: loopback` của source.
- **Security core giữ nguyên**: mọi render client chỉ đọc qua `/browser` route đã guarded; KHÔNG thêm
  endpoint mới không cần thiết; XSS-safe pipeline (view-core) được tái dùng ở client nếu preview trong dock.
- **Giữ route HTML cũ** (share/raw/bookmark/fallback khi JS lỗi) — dock là lớp phủ, không thay thế.
- **Build KISS**: giữ esbuild + inline `<style>` trong bundle (không port CSS Modules/lightningcss).
- Không đụng production khi thử: dev trên sandbox profile :3090 → verify → deploy.

### Non-goals
- Port git tab / commit / stage / discard của source (ngoài scope viewer read-only).
- Port tab registry (cần 1 tab "Files" là đủ cho v1 dock).
- Port RPC channel (loopback-only, đối nghịch target remote).
- Settings card UI (settingsScope card cần rc.7 theo README source — env + patch đủ).
- Thay thế route HTML hoàn toàn.
- Full file-tree virtualization / drag-drop / multi-select (explorer lite: dir list + file mở).

### Acceptance criteria
- [ ] Client-plugin inject thêm `layout`; đăng ký slot `details` priority -1 → dock hiện trong UI
      khi có session mở (verified trên sandbox :3090, không phá boot).
- [ ] Dock hiển thị: dir rail (tree 2 cấp), mở file → view (line numbers), nút raw/diff/home,
      status line — dữ liệu qua `fetch('/browser/?path=...')` (giữ response HTML? hay thêm JSON
      endpoint? → quyết định trong options).
- [ ] Diff + docx preview trong dock hoạt động giống route (hoặc nút mở route riêng khi cần).
- [ ] Toggle mở/đóng: `ctx.layout.openDetails()/closeDetails()` + nút trong dock; đóng cột → dock
      nổi (floating fallback như source, ResizeObserver width).
- [ ] 34 test cũ pass + test mới (client bundle inject layout, dock entry render, fetch URL build).
- [ ] Production verify: restart, /browser 200, boot không "Failed to load plugins".

## Options

### Option A (khuyến nghị): Dock render file view qua `fetch` HTML route — iframe embed
- Dock = iframe trỏ `/browser/?path=...` (hoặc `<object>`), tab chuyển path qua set iframe src.
- Chi phí thấp nhất: tái dùng 100% renderer HTML hiện có (markdown/docx/pdf/diff đều chạy), zero
  port logic server→client, giữ XSS-safe server-side.
- Trade-off: iframe hơi "cũ", focus/scroll hơi lạ, không cùng DOM với chat; CSP/size không vấn đề
  (cùng origin).
- Assumption mạnh nhất: iframe cùng origin fetch hoạt động ổn trong cột details (đúng — webServer
  route đã serve HTML).
- Fail-first: nếu iframe bị cột details gate ẩn → floating fallback (đã có pattern source).

### Option B: Dock render React trực tiếp, reuse view-core logic ở client
- Port `resolveWithin`-ish logic? KHÔNG — client không đọc fs. Data qua fetch JSON endpoint mới
  (`/browser/api/read?path=` trả text/diff/docx-meta JSON), render React tree + view + diff.
- Chi phí cao: thêm JSON endpoint + port diff/markdown/docx render client-side + test client mới.
- Đánh đổi: UX tốt nhất (cùng DOM, scroll mượt, diff interactive), nhưng trùng logic server+client
  (2 renderer, drift risk) — vi phạm DRY trừ khi server trả view-model thuần (không HTML).

### Option C: Chỉ thêm "Open in pane" nút trong dock mở route tab mới (không embed)
- Đơn giản nhất (nút → window.open /browser), nhưng KHÔNG phải "in-app" — user vẫn rời UI chính.
- Không đạt outcome mong muốn ("hiện pane trong ui luôn" như source).

## Recommendation
**Option A** cho v1 dock: iframe embed route HTML. Lý do:
- Zero port renderer logic (markdown/docx/pdf/diff giữ nguyên server-side XSS-safe).
- Remote-safe tuyệt đối (cùng cơ chế route đã chạy production).
- Chi phí nhỏ nhất để đạt "pane trong UI" đúng nghĩa; route vẫn là single source of truth.
- Sau này nâng lên Option B khi cần UX cao hơn (diff interactive) — vẫn giữ được dock shell.

## Handoff
- Xia reference: `plans/reports/260818-1005-xia-better-sidebar-compare.md`
- Research gốc: `plans/research/260817-1242-expand-research.md`
- Thực hiện: `/ak-cook` theo Option A (hoặc B nếu anh muốn full React dock).
- Risk còn mở: cột details gate (blank session) → floating fallback; boot-fail nếu `layout` không
  inject đúng (có test guard).