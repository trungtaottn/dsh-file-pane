# Feature Comparison: Pane & View design — Codex / Warp / tmux vs dsh-file-pane

## Source
- **openai/codex** (TUI: `codex-rs/tui/`) — đọc source thật: `diff_render.rs`, `bottom_pane/`, `terminal_palette.rs`, `color.rs` + chạy CLI thật trong tmux.
- **tmux 3.5a** (local) — pane split/layout/border/status.
- **Warp** — pattern block-based terminal, sidebar + preview (kiến thức chuẩn).

## Local Project
`dsh-file-pane` — web HTML pane (file list + content), hiện đang side-by-side diff.

## Head-to-Head

| Aspect | Codex TUI | tmux | Warp | dsh-file-pane (hiện tại) | Recommendation |
| --- | --- | --- | --- | --- | --- |
| **Diff format** | **Unified** (1 luồng: `-`/`+`/` `), hunk-aware syntax highlight, hard-wrap, tab→4sp | n/a (terminal) | Unified (GitHub-style) | Side-by-side 2 cột | **Chuyển sang unified** — compact, giữ syntax state, quen thuộc |
| **Line numbers** | Right-aligned, width = max line number, gutter màu riêng | n/a | Có | Có (2 cột riêng) | Giữ, 1 cột duy nhất |
| **Gutter signs** | `+`/`-`/` ` với màu riêng (dark: `#213A2B` add, `#4A221D` del) | n/a | `+`/`-` | `+`/`−` trong cột giữa | Giữ, gắn vào cột line-number (Codex style) |
| **Status line** | Bottom: `model · effort · cwd` | Status bar: active pane highlight | Bottom bar | Header trên | **Thêm bottom status line** (session · root · counts) |
| **Composer/input** | Bottom pane (ChatComposer) riêng, có popup (file search, approvals) | n/a | Command palette | Header actions | Bottom bar thay header actions cho file view |
| **Pane structure** | Transcript top + bottom composer + side threads | Split h/v, layouts (main-horizontal, even-horizontal), borders, zoom, swap | Sidebar (sessions/files) + main | Header + body (rail + main) | Giữ rail trái (tmux/warp-like), tinh chỉnh border |
| **Colors (diff)** | Theme-aware: dark muted tint, light GitHub pastels | Mặc định terminal | Git colors | `rgba(255,80,80,.10)`/`rgba(63,185,80,.10)` | Dùng palette Codex dark: `#213A2B`/`#4A221D` tông muted |
| **Hunk header** | Path header per file, `⋯` gap cho hunk 2 | n/a | `@@ -x,y +x,y @@` | Không | Thêm `@@` hunk header như git |

## Key findings (source anatomy)

### Codex `diff_render.rs`
- Mỗi dòng: **line number (right-aligned) + gutter sign + content**, 1 luồng unified.
- `DiffLineType`: Insert(+)/Delete(-)/Context(space) — `+` text xanh, `-` text đỏ + dim overlay khi highlight.
- **Theme-aware backgrounds**: dark → `#213A2B` (add) / `#4A221D` (del) muted; light → GitHub pastels `#dafbe1`/`#ffebe9`, gutter đậm hơn.
- **Syntax highlight theo hunk** (giữ parser state liên tục trong hunk — quan trọng cho string/comment nhiều dòng).
- **Hard-wrap** dài, **tab → 4 spaces**.
- Line number width = width của max line number (căn phải).

### Codex TUI layout
- Transcript chính ở trên, **bottom pane** = composer + views (approval overlay, file search popup, custom prompt).
- **Status line** dưới cùng: `gpt-5.5 medium · ~/Code/dsh-file-pane` — model, effort, cwd.
- Selector `›`, dialog trust/hooks, warning blocks `⚠` wrap text.
- Side conversations = thread list bên cạnh.

### tmux
- `split-window -h/-v`, layouts: `even-horizontal`, `even-vertical`, `main-horizontal`.
- `pane-border-style` / `pane-active-border-style` — border phân biệt active pane.
- `resize-pane -Z` (zoom), `swap-pane`.
- Status bar: `status-style`, active pane highlight.

### Warp (kiến thức)
- Block-based output, **left sidebar** (sessions + files), main pane phải, command palette, file preview.

## Recommendation (thiết kế lại dsh-file-pane)

Học từ Codex nhất (vì nó là coding agent CLI gần nhất):

1. **Diff view → UNIFIED** (bỏ side-by-side):
   ```
   @@ path/to/file.txt @@
   1  line one
   2 -line two        ← nền #4A221D, text đỏ muted
   3 +line two CHANGED ← nền #213A2B, text xanh muted
   4  line three
   5 +line four
   ```
   - Line number (right-aligned, tabular) + gutter `+`/`-`/` ` + content.
   - Màu theo Codex dark palette (muted, không chói): add bg `#213A2B`, del bg `#4A221D`.
   - `@@` hunk header khi đổi file/hunk (giống git/Codex).
   - Syntax highlight hunk-aware (tái dùng `highlightFor` hiện có, giữ state trong hunk).

2. **Bottom status line** (Codex style): `session <id> · root <path> · +a −r · N file` — thay vì chỉ header.

3. **Bottom bar** (tmux/warp-like) thay header actions cho file view: `[view] [raw] [copy] [diff]` dưới cùng như status bar, không phải header trên.

4. **Rail trái** giữ (warp/tmux-like) nhưng: border active, icon file/folder SVG, hover.

5. **Đồng bộ màu**: dùng token Codex dark muted thay vì rgba nhạt hiện tại.

## Unresolved
1. Anh có muốn giữ toggle unified↔side-by-side không, hay chỉ unified?
2. Bottom status line có hiển thị session id không (riêng tư)?
