# dsh-file-pane

[![CI](https://img.shields.io/github/actions/workflow/status/trungtaottn/dsh-file-pane/ci.yml?branch=main&label=CI)](https://github.com/trungtaottn/dsh-file-pane/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933)](https://nodejs.org/)

一个 DeepSeek Harness 插件，让你**在远程设备上通过 DSH Web UI 直接读取 Agent 生成/修改的文件**，无需下载。适合把 DSH 部署在家里服务器（homelab）、再从另一台设备连接的使用场景。

`dsh-file-pane` 用 **类 Codex/Warp 的分栏面板** 渲染文件（左侧文件栏 + 右侧内容栏，带行号、内嵌图片/PDF、语法高亮），并提供**应用内 dock**（右侧 `details` 栏）：文件树、git 分支与变更、提交历史、逐行 blame、workspace 搜索、实时文件监听与主题切换。它**只读**（唯一的写入面是默认关闭的本地 `git commit`），并限定在 workspace 根目录内，阻止路径穿越与符号链接逃逸。

<p align="center">
  <img src="./docs/demo.svg" width="720" alt="dsh-file-pane 运行截图">
</p>

## 功能

- **远程文件视图** —— 在任意设备的 DSH Web UI 中浏览/读取 workspace：`/browser/` 列表、带行号的代码、markdown 预览、内嵌图片、PDF.js 查看器、宿主机侧 `.docx` 预览、原始字节。
- **版本 diff** —— Agent 编辑的前/后内容（仅内存、按 session 隔离），unified 或 side-by-side，带词级 intraline diff 标记。
- **应用内 dock**（`details` 栏）—— 文件树、git 分支 + 变更、提交历史、逐行 blame、workspace 搜索、实时文件监听、主题切换。
- **宿主机侧语法高亮** —— Shiki（纯 JS 引擎、无 WASM）token span + 双主题 CSS 变量，以及大文件分页渲染。
- **只读为主的 git** —— branch/status/log/blame；可选的本地 `git commit` **默认关闭**（`gitWriteEnabled: false`）。

## 安装

```sh
# 在你的 profile 中
dsh plugin --profile web add /path/to/dsh-file-pane
# 重启 Web 服务以加载新的 bundle 与路由
sudo systemctl restart dsh-file-pane-web
```

默认 workspace 根目录为 `$HOME`。可通过 `DSH_FILE_PANE_ROOT` 环境变量覆盖
（patch 层用 `!!js process.env` 读取），或在更晚的 patch 覆盖层设置该行的
`config.workspaceRoot`（优先级更高）：

```yaml
# dsh-file-pane / cordis.patch.yml（或你的 profile patch 覆盖）
- insert:
    - id: dsh-file-pane
      name: 'dsh-file-pane'
      config:
        workspaceRoot: !!js process.env.DSH_FILE_PANE_ROOT ?? process.env.HOME
        maxTextBytes: 2097152
```

```sh
# 示例：不改任何文件即可切换 workspace
DSH_FILE_PANE_ROOT=/srv/projects systemctl restart dsh-file-pane-web
```

所有按功能划分的设置（主题预设、搜索模式/globs/max、启用的语言、分页阈值、
git 写入开关 + 历史深度、实时监听开关 + 防抖/轮询 + 受信主机）都是插件行上的
配置键 —— 完整文档与默认值见 `cordis.patch.yml`。

## 使用

在远程设备的浏览器打开（host 为你的 DSH Web 源）：

```
/browser/                            文件栏（workspace 根目录）
/browser/?path=docs/README.md        markdown 预览（可切换 preview/raw）
/browser/?path=src/app.ts            带行号、语法高亮的代码视图
/browser/?path=img/logo.png          内嵌图片
/browser/?path=docs/manual.pdf       PDF.js 查看器（搜索/缩放/文本层）
/browser/?path=docs/report.docx      docx 预览（宿主机侧 mammoth）
/browser/?path=docs/&raw=1           某文件的原始字节
```

路径可以是 workspace 相对路径**或**根目录内的绝对路径 —— 面板会把根目录内的任意绝对路径
归一化，因此从 cwd 为子目录的 session 打开的文件 chip 也能解析到正确文件。

**应用内 dock**（右侧 `details` 栏）还提供：

```
Files          文件树 + 面包屑导航 + 版本 diff 切换
Git / Changes  branch 切换、脏文件集、提交历史、逐行 blame
Search         workspace 搜索（Name/Content）经 /browser/api/search
```

## 版本 diff（前 → 后）

当 agent 编辑文件时，client-plugin 会把编辑的**前/后内容** spill 到宿主机（仅内存、按当前打开的
session 隔离），面板即可渲染 diff：

```
/browser/?path=src/app.ts&diff=1&session=<id>           unified diff（默认）
/browser/?path=src/app.ts&diff=1&session=<id>&mode=sbs  side-by-side
```

diff 视图遵循 Codex/git 惯例——行号 gutter + `+`/`-` 标记、柔和的红绿底色、`@@ path @@` hunk 头——
底部有状态栏和 **unified ↔ side-by-side** 切换。变更行带**词级 intraline diff 标记**（GitHub 风格的内联增删块）。
`.md` 文件默认以渲染后的**预览**打开，可切换 preview/raw；`.docx` 文件以 mammoth 转换后的
markdown 预览打开，同样可切换（原始字节仍通过 `&raw=1` 获取）。

> Spill 仅存于 RAM 且按 session 隔离：只有编辑发生时所打开的 session 才持有其前后内容；不落盘、
> 重启即失效。通过 produced-file chip（携带 session）打开，或手动加 `&session=<id>`。

只能访问配置根目录内的文件与目录；其他情况返回 `403`。

## 远程时 "Produced" 文件直接在面板打开

当你在**非 loopback** 设备上查看 DSH 时，聊天中的 **"Produced"（产物）** 文件 chip 会直接
把 `location` 切到 `/browser/?path=<文件>` 打开面板视图；在运行 DSH 的这台机器（loopback）上，
内置行为保持不变。

通过 **client-plugin** 提供（`dsh.client`，`client/index.tsx` → 构建产物 `lib/client.js`）。它在
`conversation.chat.turnTail` 槽位以 `priority: -1` 注册，仅在远程时取代内置的 "Produced" 行，并复用
同一份 `deliverables` 回合数据。因为是 chain 槽位（首个非 null 命中生效），不会出现重复行。

bundle 必须像内置 deliverables 插件一样导出 cordis `inject` 服务列表——loader 会在调用 `apply`
之前等待这些服务，否则插件可能在 seat 就绪前激活，导致整个 Web 启动失败。`npm test` 会守护这一点。

> 需要 DSH 能提供插件预构建的 `lib/client.js`。修改客户端源码后用 `npm run build:client` 重新构建，
> 再重启 Web 服务（插件集合的变更在重启后才会进入浏览器）。

## 安全

- **只读** —— 唯一的写入面是可选的本地 `git commit`，默认关闭（`gitWriteEnabled: false` → 403）；无 push/pull/fetch。
- 路径严格处理于 `lib/view-core.mjs`（`resolveWithin`）：`..`、符号链接逃逸，以及根目录之外的绝对路径均返回 `403`。
- `/browser/ws` 的 **WS 认证围栏**：loopback/受信主机 + 同源 + `sec-fetch-site`；握手前返回裸 403；仅下行（`close(1008)`）。
- **CSRF 纵深防御**：POST 路由拒绝跨站 `Origin`。
- 可选渲染上限（`maxTextBytes`，默认 2 MiB）；搜索/blame 上限与超时约束资源占用。
- 不可信文件内容（markdown/docx）只经由 XSS 安全的管线渲染，绝不裸注入。
- 不接触、不外泄任何凭据。

## 架构

插件是同一个 cordis 插件的两半（宿主机 + 浏览器）。权威指向：`lib/` 是宿主机，
`client/` 是浏览器 bundle 源码，`cordis.patch.yml` 是配置面。

```
dsh-file-pane/
├─ lib/index.js         host 插件：/browser 路由 + spill API + /browser/ws upgrade
├─ lib/view-core.mjs    安全核心（resolveWithin）+ diffSides + renderMarkdown
├─ lib/view-html.mjs    面板渲染器（HTML）—— 文件/目录/diff/commit 页面
├─ lib/git.mjs          只读为主的 git façades（branch/status/log/blame/门控 commit）
├─ lib/search.mjs       ripgrep workspace 搜索引擎（NDJSON 流）
├─ lib/highlight.mjs    宿主机侧 Shiki 语法高亮（纯 JS 引擎）
├─ lib/watch.mjs        chokidar workspace 监听器（实时文件监听）
├─ lib/ws-server.mjs    /browser/ws 仅下行 WebSocket（认证围栏）
├─ lib/docx.mjs         宿主机侧 .docx → 安全 markdown（mammoth，懒加载）
├─ lib/client.js        预构建 client-plugin bundle（已提交）
├─ client/index.tsx     client-plugin 源码：produced chips + dock
├─ client/theme-*.ts    主题预设 + 控制器（dock 主题切换）
├─ client/search-text.ts 纯 XSS 安全片段辅助（搜索结果）
├─ assets/pdfjs/        pdfjs-viewer-element dist（经 /browser/vendor/pdfjs 提供）
├─ scripts/build-client.mjs  esbuild：client/index.tsx → lib/client.js
├─ scripts/build-pdfjs.mjs   拷贝 pdfjs-viewer-element dist → assets/pdfjs
├─ cordis.patch.yml     挂载 bundle（host 行）+ dsh.client 声明浏览器半边
└─ package.json         声明 dsh.bundle（host）+ dsh.client（浏览器）
```

`lib/` 模块是每项能力的可执行所有者——要了解当前行为请阅读它们；这里的文档只解释每个面为何存在。

## 开发

```sh
NODE_OPTIONS= npm test               # 完整套件（路由守卫 + client 契约 + search/highlight/git/watch）
NODE_OPTIONS= npm run build          # 构建 client bundle + pdfjs 资源
NODE_OPTIONS= npm run check          # import lib/index.js 健全性
NODE_OPTIONS= npm pack --dry-run     # 验证可发布的 tarball
```

> 修改客户端源码后用 `npm run build:client` 重新构建，`npm run build:assets` 拷贝 PDF.js 资源
>（两者都会在 `pretest` 自动执行）。所有 `node`/`npm` 命令都需要 `NODE_OPTIONS= ` 前缀
>（dd-trace preload 有问题）。版本/发布仅经 GitHub 侧的 semantic-release（见 `release.config.mjs`）。

## 许可证

MIT
