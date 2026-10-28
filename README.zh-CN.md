# @local/dsh-mcp-servers

[![CI](https://github.com/zeno528/dsh-mcp-servers/actions/workflows/ci.yml/badge.svg)](https://github.com/zeno528/dsh-mcp-servers/actions/workflows/ci.yml)
[![Secrets scan](https://github.com/zeno528/dsh-mcp-servers/actions/workflows/gitleaks.yml/badge.svg)](https://github.com/zeno528/dsh-mcp-servers/actions/workflows/gitleaks.yml)

[English](README.md) | 简体中文

在 DSH Web 里以**顶层侧边栏页面**（"MCP"）管理 MCP 服务器：添加、编辑、启停、
删除 MCP 服务器，配置其凭据，并查看每台服务器的实时连接状态与工具数量。
页面为主从布局——左侧服务器列表，右侧所选服务器的编辑表单。

> **说明**：这是 DSH（DeepSeek Harness）的第三方 bundle。它依赖 DSH 运行时
> （`@deepseek-ai/*` 包，加载时从宿主安装解析），这些包不随本仓库分发。

## 文件

| 文件 | 作用 |
|---|---|
| `package.json` | Bundle 清单（`dsh.bundle.patch`）与 Web 客户端声明（`dsh.client`）。 |
| `cordis.patch.yml` | 插入唯一的 Host 行 `mcp-servers`，其 `config.servers` 即继承的默认列表（迁移自原工作区的四个服务器）。 |
| `index.js` | 宿主侧：易变 `Config.servers`、Loader 协调、凭据解析，以及带鉴权的状态路由。 |
| `client.js` | 浏览器侧：顶层页面（`sidebar.panellist` + `main` 插槽）与实时状态轮询。 |
| `locale/en.json`、`locale/zh.json` | Bundle 展示元数据。 |
| `icon.svg` | Bundle 原创图标。 |

## 工作原理

- 设置文档条目 `mcp-servers`（profile 的 Cordis patch）是唯一的持久事实来源。
  其 `servers` 数组是唯一的易变字段，因此表单的一次编辑就是一次原子设置写入。
- 宿主侧为每个启用的服务器派生一个根树 `@deepseek-ai/dsh-mcp-client` Loader
  条目（`mcp-server-<serverName>`）。派生条目仅存在于运行时——根 Loader 树在
  内存中，每次启动、HMR 重组或插件重载时都会重建。
- 协调在激活时、`loader/volatile-update` 时、`credentials/reference-updated`
  时，以及每 5 秒一次的兜底 tick 上运行。只有当服务器行或其解析出的凭据
  确实变化时才会重载连接。
- 若某 `serverName` 仍被手写的 `dsh-mcp-client` 行占用，则报名称冲突并跳过；
  移除该行后，本页面会在下一个 tick 自动接管。
- 凭据是引用，绝不是字面量：`credentialRef` 命名一个环境变量形状的凭据引用，
  在派生条目物化前一刻通过 `ctx.credentials` 解析（存储文件 → 启动 env →
  项目 `.env` → `~/.dsh/.env`）。
- 实时状态投影由 `POST /plugin-mcp-servers/status` 提供。路由经 `ctx.webServer`
  注册，每个请求都过连接信任栅栏（`ctx.connection.requestRejection`），
  因此只有已鉴权的页面能读取。

## 页面入口

浏览器侧注册两个插槽，不再注册 `plugins.item`：

- `sidebar.panellist` —— 侧边栏条目（`id: 'mcp'`），页面由此成为与 Plugins、
  Schedules 并列的顶层面板。
- `main` —— 页面本身（`key: 'mcp'`），选中该面板时渲染。

页面拥有自己的设置表单（`ctx.configForms.get('mcp-servers')`）并直接读写，
不依赖 Plugins 页面。

## 重置为默认

页面里的"重置为默认"会清除 profile patch 覆盖；条目随即继承本 bundle
`cordis.patch.yml` 里的 `config.servers`。

## 迭代 bundle

- 宿主 `index.js` 的修改在下一次 HMR 重组时生效（任何 profile patch 写入都会
  触发）。客户端 `client.js` 的修改走客户端模块 HMR 路径自行生效：
  `dsh-client-hmr` 每 500 ms 轮询客户端产物的 mtime/ctime/size，内容指纹
  变化即重新导入模块。
- `package.json` 的修改（尤其 `dsh.client` 与 `peerDependencies`）按包缓存至
  进程生命周期结束；需重装/替换 bundle 或重启应用。
- `@deepseek-ai/schemastery` 特意声明为 peer dependency：linked-root 模块解析
  会把该裸导入路由到 DSH 安装内的副本，插件不自带。
