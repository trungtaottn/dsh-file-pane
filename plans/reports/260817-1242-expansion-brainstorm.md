# Brainstorm: dsh-file-pane v0.3 — Expansion Contract

_Timestamp: 2026-08-17 12:42 · Dựa trên `plans/research/260817-1242-expand-research.md`_

## Brainstorm contract

### Outcome
Plugin `dsh-file-pane` nâng cấp lên **v0.3.0** với: (1) `workspaceRoot` cấu hình được qua env
(không hardcode), (2) path-mapping đúng giữa deliverable (session cwd) và pane (workspaceRoot),
(3) preview `.docx` trong pane (host-side, XSS-safe, giữ kiến trúc zero-client-JS), (4) publish-ready
(`npm pack` clean + README + `.code-workspace`). Toàn bộ vẫn chạy trên DSH rc.6 đang live, 19+ tests
pass, không phá tính năng v0.2.0.

### Constraints
- **Không đổi kiến trúc cốt lõi**: view-core mount-agnostic + view-html server-render + route `/browser`
  + client-plugin seam — giữ nguyên.
- **Không thêm client JS bundle cho preview**: pane là HTML host-render; docx xử lý host-side.
- **Bảo mật giữ nguyên chuẩn**: mọi path qua `resolveWithin` (403 ngoài root); mọi nội dung file
  không tin cậy (docx/md) chỉ render qua pipeline XSS-safe (`escapeHtml`/`renderMarkdown`).
- **Không đụng production :3080 khi thử**; test = `npm test` + (nếu cần UI) sandbox profile :3090.
- **NODE_OPTIONS trống** cho mọi lệnh node/npm/dsh.
- Version nhảy `0.2.0 → 0.3.0` (minor — tính năng mới, backward-compatible).

### Non-goals (v0.3)
- In-app UI React mount (thay route) — để v0.4+ (upgrade-fragile, chi phí cao; đã ghi R&D).
- PDF.js viewer nâng cấp — giữ native iframe (zero-dep); pdfjs là item độc lập sau này.
- Multi-root workspace registry (port dsh-multiroot-workspace) — quá tầm; abs-path normalize đủ.
- Write/download UX mới, git-diff, snapshot đĩa — ngoài scope.
- Settings UI row trong DSH Settings (env là đủ cho v0.3).

### Acceptance criteria
- [ ] `cordis.patch.yml` đọc `process.env.DSH_FILE_PANE_ROOT` (fallback `$HOME`); verify bằng
      `dsh --dump-config` + test đơn vị cho config resolution.
- [ ] `/browser/?path=<absolute-within-root>` render đúng (file/dir/diff/raw) — test 200;
      abs ngoài root → 403 (test).
- [ ] Client chip click với session cwd là subdir → mở đúng file (test producedForClosing path
      resolution / integration unit test cho `openInPane`-logic).
- [ ] `.docx` mở ra preview markdown/HTML qua mammoth (XSS-safe) + toolbar preview/raw;
      `&raw=1` vẫn trả bytes gốc — test với fixture docx (hoặc mock mammoth).
- [ ] `NODE_OPTIONS= npm test` toàn bộ pass (19 cũ + test mới).
- [ ] `npm pack --dry-run` không có cảnh báo thiếu file; `files` đủ (lib/client.js nằm trong).
- [ ] README cập nhật: env config, docx preview, abs path; version 0.3.0 trong package.json.

## Options

### Option 1 (khuyến nghị): Scope đầy đủ v0.3 — config + path-mapping + docx + publish-prep
- Chi phí: trung bình (4 mảng nhỏ, mỗi mảng độc lập, test kèm theo).
- Rủi ro thấp nhất: mỗi mảng có thể merge riêng; rollback dễ (từng commit).
- Assumption mạnh nhất: mammoth chạy host-side ổn định trên Node 22 (đúng — lib thuần JS,
  không native dep); docx là định dạng user thực sự cần xem.
- Fail-first: nếu mammoth import làm phình startup → dynamic import ở nhánh docx (đã ghi trong
  research pitfalls).

### Option 2: Chỉ config + path-mapping (bỏ docx/publish khỏi v0.3)
- Chi phí: rất thấp (2 mảng), ship nhanh nhất.
- Đánh đổi: `.docx` vẫn hiện "binary" — agent làm việc với tài liệu Word không đọc được từ remote.
- Dùng khi: ưu tiên tốc độ, docx để v0.3.1.

### Option 3: Scope đầy đủ + PDF.js viewer (pdfjs-viewer-element)
- Chi phí: cao hơn (static asset route + CSP test + 3.5MB).
- Rủi ro: kích thước bundle, CSP/iframe sandbox tương tác, thời gian test.
- Dùng khi: PDF là định dạng chính của user và iframe native chưa đủ (vd mobile/theme).

## Recommendation
**Option 1.** Lý do: cả 4 mảng độc lập, đều trả giá trị ngay, mỗi cái test được riêng; docx là
gap thực tế lớn nhất còn lại của viewer (agent tạo .docx → remote không đọc được). PDF.js và
in-app UI là các bước kế tiếp rõ ràng (ghi trong research), không cần làm chung một đợt.

## Handoff
- Research: `plans/research/260817-1242-expand-research.md`
- Tiếp theo: `/ak-cook` (implement theo Option 1) — hoặc chốt Option 2/3 nếu anh muốn scope khác.
- Xia reference đã phân tích: `dsh-multiroot-workspace` (patterns), `dsh-agent-teams` (plugin-dev guide)
  — xem `plans/reports/260817-1242-xia-reference-compare.md`.
