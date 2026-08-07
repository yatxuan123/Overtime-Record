# GitHub 云同步配置指南

这套应用将代码和加班数据都保存在同一个公开的 GitHub 仓库：

```text
项目仓库：yatxuan123/Overtime-Record（Public）
Worker：Cloudflare Worker
数据文件：data/overtime-records.json
```

## 1. 使用当前项目仓库

不需要创建第二个仓库。Worker 会在当前项目仓库中读写 `data/overtime-records.json`。

该文件会公开显示，Git 提交历史也会保留旧版本。不要在备注中填写账号、密码、客户隐私或其他不希望公开的内容。

## 2. 创建最小权限 GitHub Token

在 GitHub 打开：`Settings` → `Developer settings` → `Personal access tokens` → `Fine-grained tokens`。

创建 Token 时设置：

- Resource owner：`yatxuan123`
- Repository access：`Only select repositories`
- 只选择：`Overtime-Record`
- Repository permissions → Contents：`Read and write`
- 其他权限全部保持 `No access`

Token 只在创建成功页面显示一次。不要把它写进 React、`vite.config.ts`、GitHub Pages、聊天记录或 Git 提交。

## 3. 生成同步密码

同步密码不是 GitHub Token。建议在本地终端生成一组随机值：

```bash
openssl rand -base64 32
```

把结果保存到密码管理器。后续页面连接时需要输入这组密码。

## 4. 创建 Cloudflare Worker

登录 Cloudflare，进入 `Workers & Pages` → `Create application` → `Create Worker`。

Worker 名称可以使用：

```text
overtime-record-api
```

部署后会得到一个类似下面的地址：

```text
https://overtime-record-api.<你的 Cloudflare 子域>.workers.dev
```

项目中的 Worker 源码位于 `worker/src/index.ts`，配置模板位于 `worker/wrangler.toml`。本地部署需要 Wrangler；当前项目没有自动安装它。安装前请先确认包管理器，安装方式如下：

```bash
pnpm add --save-dev wrangler
pnpm exec wrangler deploy --config worker/wrangler.toml
```

也可以在 Cloudflare 控制台使用在线编辑器部署，但必须把 Worker 依赖的同步数据模块一起打包后再粘贴，推荐使用 Wrangler 以避免漏文件。

## 5. 设置 Worker 变量和 Secrets

普通变量来自 `worker/wrangler.toml`：

```text
GITHUB_OWNER=yatxuan123
GITHUB_REPO=Overtime-Record
GITHUB_BRANCH=main
DATA_PATH=data/overtime-records.json
ALLOWED_ORIGIN=https://yatxuan123.github.io
```

在 Cloudflare Worker 的 `Settings` → `Variables and Secrets` 中新增两个加密 Secret：

```text
GITHUB_TOKEN=<刚创建的 Fine-grained Token>
SYNC_PASSWORD=<刚生成的同步密码>
```

如果使用 Wrangler，命令是：

```bash
pnpm exec wrangler secret put GITHUB_TOKEN --config worker/wrangler.toml
pnpm exec wrangler secret put SYNC_PASSWORD --config worker/wrangler.toml
```

命令会交互式读取输入，输入内容不会写入配置文件。完成后重新部署 Worker。

## 6. 在网页中连接云端

1. 打开 `https://yatxuan123.github.io/Overtime-Record/`。
2. 点击右上角同步状态按钮。
3. Worker 地址填写完整的 `https://...workers.dev` 地址。
4. 输入 `SYNC_PASSWORD` 的值。
5. 点击“连接云端”。

连接成功后：

- 页面先使用本地缓存渲染。
- 云端数据会被读取并合并。
- 旧版 `localStorage` 数据会自动进入待同步状态。
- 首次成功上传后，当前项目仓库会出现 `data/overtime-records.json`。

同步密码只保存到当前浏览器会话的 `sessionStorage`。关闭浏览器后需要重新输入；Worker 地址会保存在本地设置中。

## 7. 验证清单

- 项目仓库页面显示 `Public`。
- Token 的 Contents 权限只授予 `Overtime-Record`。
- 浏览器开发者工具中看不到 GitHub Token。
- 新增一条记录后，Worker 状态变为“已同步”。
- 项目仓库出现 `data/overtime-records.json`。
- 开启飞行模式时新增记录，状态显示“待同步”；恢复联网后自动同步。
- 在另一台设备输入 Worker 地址和同步密码，可以读取同一条记录。

## 8. 撤销凭据

发生泄露或不再使用时，按以下顺序处理：

1. 在 GitHub 删除旧 Fine-grained Token。
2. 在 Cloudflare 删除或更新 `GITHUB_TOKEN` Secret。
3. 生成新的同步密码并更新 `SYNC_PASSWORD` Secret。
4. 在每台浏览器重新输入新同步密码。

同步密码泄露只影响这个 Worker 接口；GitHub Token 泄露则可能影响被授予的仓库权限，必须优先撤销。

## 9. 常见错误

| 状态 | 原因 | 处理 |
|---|---|---|
| `未连接` | Worker 地址或同步密码未配置 | 在同步面板重新连接 |
| `需验证` | Worker 的 `SYNC_PASSWORD` 不匹配 | 检查 Secret 并重新输入 |
| `云端服务暂时不可用` | Token、仓库名或 Worker 部署配置错误 | 检查 GitHub Token 的仓库和 Contents 权限 |
| `有冲突` | 多设备同时保存且自动合并重试仍失败 | 点击“立即同步”后再次尝试 |
| 页面能打开但一直待同步 | Worker CORS 或地址配置错误 | 确认 `ALLOWED_ORIGIN` 精确等于 Pages 地址 |
