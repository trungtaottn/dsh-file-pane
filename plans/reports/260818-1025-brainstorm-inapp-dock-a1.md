# Brainstorm: dsh-file-pane v0.2.0 — in-app dock qua slot `details` (Option A)

_Timestamp: 2026-08-18 10:25 · Dựa trên `plans/research/260818-1020-inapp-dock-seam.md` + xia compare `260818-1005-xia-better-sidebar-compare.md`_

## Brainstorm contract

### Outcome
Plugin có **in-app dock**: file pane hiện trong DSH web UI (cột `details` phải, conversation co lại
bên cạnh — không rời trang) cho **mọi kiểu kết nối**: local, LAN IP, Tailscale, Cloudflare tunnel.
Data qua HTTP route `/browser` hiện có (remote-safe, không cần detect). Route `/browser` giữ nguyên
làm deep-link/raw/fallback. Chạy trên DSH rc.6 đang live.

### Constraints
- Seam chuẩn rc.6 (đã verify): slot `details` single, `ctx.layout.openDetails()/closeDetails()`,
  `sessions/slots/locale/connection/layout` services. KHÔNG upgrade rc.7 cho v1.
- **Data channel = HTTP fetch `/browser`** (route không bị trust-fence — đã test 200 với Host lạ).
  KHÔNG port RPC `authority: loopback` của source.
- Security core giữ nguyên: mọi render qua route guarded; iframe cùng origin không thêm CSP risk.
- **Build KISS**: esbuild thuần + inline `<style>` (không port CSS Modules/lightningcss).
- Mọi registration trong `ctx.effect(...)` (HMR-safe); bundle-exported `inject` là nguồn thật.
- Không đụng production khi thử: sandbox profile :3090 → verify → deploy (quy trình handoff).

### Non-goals (v1 dock)
- Port git tab / commit / stage / discard / tab-registry của source.
- Port RPC channel (loopback-only, đối nghịch target remote).
- Settings-card (cần rc.7+; env đủ cho v1).
- Full file-tree virtualization / drag-drop / multi-select (dock v1: iframe route — cây/điều hướng
  do route HTML đảm nhận, đủ dùng).
- Thay thế route `/browser` hoàn toàn.

### Acceptance criteria
- [ ] Client bundle `inject` có `'layout'` (test guard — thiếu → boot-fail regression test).
- [ ] Dock hiện trong cột `details` (verified sandbox :3090): toolbar (home/up/raw/diff) + iframe
      `src=/browser/?path=...`; mở file từ produced chips → dock mở + load file (không rời trang).
- [ ] Floating fallback: cột đóng (blank session/narrow) → dock nổi 320px phải, không biến mất
      (ResizeObserver width, pattern source).
- [ ] Toggle: nút đóng/mở trong dock qua `layout.openDetails()/closeDetails()`.
- [ ] 34 test cũ pass + test mới (inject layout, DockEntry render, event → src, floating logic).
- [ ] Production verify: restart, boot không "Failed to load plugins", /browser 200, dock hiện
      khi có session mở (remote qua harness.nes.codes).

## Options

### Option A1 — Shadow slot `details` bằng dock iframe (khuyến nghị cho "pane thật")
- Mount: `slots.inject('details', ...register({name:'details', priority:-1}, DockEntry))` — DockEntry
  = iframe `/browser/?path=...` + toolbar + toggle + floating fallback (port từ source).
- Chi phí: thấp-trung bình (1 component React + event bridge; zero port renderer logic).
- **Trade-off**: **mất DetailsPanel tool-details mặc định của DSH** (shadow single, không fallback).
  Đây chính là cái better-sidebar đã chấp nhận và ghi rõ trong README.
- Assumption mạnh nhất: user chấp nhận mất tool-details view (click tool-call để xem input/output)
  để đổi lấy pane thường trực. Fail-first: nếu không chấp nhận → Option A2.
- Đánh giá: đúng "pane trong UI luôn" như anh mong muốn; đơn giản, remote-safe.

### Option A2 — Không shadow: dock nổi qua `shell.overlay` (giữ DetailsPanel)
- Mount: slot `shell.overlay` (list, root scope — additive seat, không chiếm chỗ thật) + nút toggle
  trong sidebar footer (như better-sidebar làm cho collapsed state).
- Ưu: **giữ nguyên DetailsPanel mặc định**; không đụng layout cột.
- Nhược: overlay **đè lên conversation** (không phải cột co lại) — trải nghiệm kém hơn "dock thật";
  phải tự xử lý z-index, width, đóng khi user tương tác chat. Khác xa "cách họ làm" mà anh khen.
- Dùng khi: giá trị DetailsPanel > giá trị pane thường trực.

### Option A3 — Kết hợp: dock có 2 tab "Files" + "Details" (tái tạo DetailsPanel bên trong)
- Giữ slot details (shadow) nhưng tái tạo tool-details view trong dock bằng dữ liệu từ sessions
  projection (selection.callId → materialFor) — KHÔNG import được DetailsPanel (cross-plugin value
  import bị cấm), phải tự render lại logic tool-call material.
- Chi phí: cao (port materialFor + diff card render). Rủi ro drift với source mỗi lần DSH upgrade.
- Dùng khi: không muốn mất tool-details nhưng vẫn cần dock thật — đánh đổi công sức lớn.

## Recommendation

**Option A1** (shadow slot `details` bằng dock iframe) — vì:
1. Đúng yêu cầu "hiện pane trong ui luôn" như anh thấy ở repo nguồn (cùng cơ chế, cùng trade-off
   đã được họ chấp nhận trong release).
2. Chi phí thấp nhất trong các option cho outcome đó: zero port renderer, remote-safe tuyệt đối.
3. Nếu sau này anh muốn tool-details trở lại, nâng lên A3 là hướng rõ ràng (ghi R&D), dock shell
   giữ nguyên.

## Handoff
- Research: `plans/research/260818-1020-inapp-dock-seam.md`
- Xia: `plans/reports/260818-1005-xia-better-sidebar-compare.md`
- Tiếp theo: `/ak-cook` theo A1 (implement trên branch mới từ main, test sandbox :3090, rồi deploy).
- Risk còn mở: mất DetailsPanel (cần anh chốt); cột details gate blank session → floating fallback
  (đã có pattern); boot-fail nếu inject thiếu 'layout' (có test guard).

## Unresolved Questions
1. **Anh chốt Option A1 chứ** (chấp nhận mất tool-details view mặc định của DSH)?
2. Có cần `?embed=1` variant (route render gọn, bỏ topbar) cho iframe đẹp hơn?
3. Toggle phím tắt Ctrl/Cmd+Shift+B có cần không?
4. Dock mặc định MỞ hay ĐÓNG khi có session? (persist localStorage như source, default mở)
