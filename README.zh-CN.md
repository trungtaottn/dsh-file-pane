# dsh-file-pane

[![CI](https://img.shields.io/github/actions/workflow/status/trungtaottn/dsh-file-pane/ci.yml?branch=main&label=CI)](https://github.com/trungtaottn/dsh-file-pane/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

一个 DeepSeek Harness 插件，让你**在远程设备上通过 DSH **Web** UI 直接读取 Agent 生成/修改的文件**，无需下载。适合把 DSH 部署在家里服务器（homelab）、再从另一台设备连接的使用场景。

`dsh-file-pane` 用 **类 Codex/Warp 的分栏面板** 渲染文件（左侧文件栏 + 右侧内容栏，带行号、内嵌图片/PDF）。它**只读**，并限定在 workspace 根目录内，阻止路径穿越与符号链接逃逸。

<p align="center">
  <img src="./docs/demo.svg" width="720" alt="dsh-file-pane 运行截图">
</p>

> v0.3.0 — 新增 **可通过环境变量配置的 workspace 根目录**（不再硬编码路径）、
> **`.docx` 预览**（宿主机侧 mammoth → 安全 markdown）、**绝对路径支持**
> （任意 session cwd 的 deliverable 路径都能正确解析），以及带**原生 iframe 回退**的
> **PDF.js 查看器**（搜索/缩放/文本层）。仍然只读、仍然限定单个 workspace 根目录、
> 预览管线仍然零客户端 JS。

## 为什么

有经验的用户把 DSH 跑在一台服务器上，再从另一台设备通过 Web 使用。内置的 "deliverables" 只会在**宿主机**上打开文件（`host.openPath`，仅限 loopback），所以在远程设备上若不借助 SSH 或下载，就无法读取文件。本插件为此提供了 Web 可访问的只读查看。

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

## 使用

在远程设备的浏览器打开（host 为你的 DSH Web 源）：

```
/browser/                            文件栏（workspace 根目录）
/browser/?path=docs/README.md        markdown 预览（可切换 preview/raw）
/browser/?path=src/app.ts            带行号的代码视图
/browser/?path=img/logo.png           内嵌图片
/browser/?path=docs/manual.pdf        PDF.js 查看器（搜索/缩放/文本层）
/browser/?path=docs/report.docx       docx 预览（宿主机侧 mammoth）
/browser/?path=docs/&raw=1           某文件的原始字节
```

路径可以是 workspace 相对路径**或**根目录内的绝对路径
（`/browser/?path=/home/user/src/app.ts` 同样可用）——面板会把根目录内的任意绝对路径
归一化，因此从 cwd 为子目录的 session 打开的文件 chip 也能解析到正确文件。

## 版本 diff（前 → 后）

当 agent 编辑文件时，client-plugin 会把编辑的**前/后内容** spill 到宿主机（仅内存、按当前打开的
session 隔离），面板即可渲染 diff：

```
/browser/?path=src/app.ts&diff=1&session=<id>           unified diff（默认）
/browser/?path=src/app.ts&diff=1&session=<id>&mode=sbs  side-by-side
```

diff 视图遵循 Codex/git 惯例——行号 gutter + `+`/`-` 标记、柔和的红绿底色（`#4a221d` / `#213a2b`）、
`@@ path @@` hunk 头——底部有状态栏（`path · session · +a/−r`）和 **unified ↔ side-by-side** 切换。
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

> 需要 DSH 能提供插件预构建的 `lib/client.js`。修改客户端源码后用 `npm run build:client` 重新构建，
> 再重启 Web 服务（插件集合的变更在重启后才会进入浏览器）。

## 安全

- 只读 — 无写入/部署面。
- 路径严格处理于 `lib/view-core.mjs`：`path.resolve` + realpath + 根目录前缀检查；`..`、符号链接逃逸，
  以及根目录之外的绝对路径均返回 `403`。
- 可选渲染上限（`maxTextBytes`，默认 2 MiB），超大日志会截断而非卡死页面。
- `.docx` 转换（mammoth）输出是**不可信文件内容**——只经由 XSS 安全的 markdown 管线渲染，绝不裸注入。
- PDF.js 查看器资源从 `assets/pdfjs` 提供，带 basename + resolve-inside 守卫；该目录之外不可达。
- 不接触、不外泄任何凭据。

## 架构

```
dsh-file-pane/
├─ lib/index.js         host 插件：在 ctx.webServer 上注册 /browser
├─ lib/view-core.mjs    与挂载无关的核心：根目录守卫、MIME、list/read（可复用）
├─ lib/view-html.mjs    面板渲染器（HTML）—— 当前挂载
├─ lib/docx.mjs         宿主机侧 .docx → 安全 markdown（mammoth，懒加载）
├─ lib/client.js        预构建 client-plugin bundle（exports["./client"]）
├─ client/index.tsx     client-plugin 源码：produced-file chips → /browser（远程）
├─ assets/pdfjs/        pdfjs-viewer-element dist（经 /browser/vendor/pdfjs 提供）
├─ scripts/build-client.mjs  esbuild：client/index.tsx → lib/client.js（__ModuleLoader__）
├─ scripts/build-pdfjs.mjs   拷贝 pdfjs-viewer-element dist → assets/pdfjs
├─ cordis.patch.yml     挂载 bundle（host 行）+ dsh.client 声明浏览器半边
└─ package.json         声明 dsh.bundle（host）+ dsh.client（浏览器）
```

安全核心（`view-core`）与渲染器解耦，未来迁移为应用内 client-plugin 时只需叠加新的挂载层，核心与路由不变。

## 开发

```
npm run build          # 构建 client bundle + pdfjs 资源
npm test               # host 路由守卫 + client-plugin bundle 契约 + docx/pdfjs
node --input-type=module -e "import('./lib/index.js').then(m=>console.log(m.name))"
```

> 修改客户端源码后用 `npm run build:client` 重新构建，`npm run build:assets` 拷贝 PDF.js 资源
>（两者都会在 `pretest` 自动执行）。`dsh --profile web --dump-config` 应能看到插件行带有
> env 解析后的 `workspaceRoot`。

## 许可证

MIT
