# GitHub Private Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将加班记录升级为由 Cloudflare Worker 安全读写 GitHub 私有仓库、支持本地缓存和离线恢复的个人多设备同步应用。

**Architecture:** 浏览器使用版本化同步信封保存本地缓存，通过 Worker HTTP 客户端读取和写入云端快照。纯函数负责记录合并和 tombstone 冲突处理，`SyncController` 负责串行上传、状态通知和联网恢复，React 只消费控制器状态。Cloudflare Worker 固定访问一个私有仓库文件，并通过同步密码、来源校验和 GitHub 文件 SHA 保证安全及并发正确性。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、Cloudflare Workers Web API、GitHub Contents API。

## Global Constraints

- 不新增 npm 依赖，继续使用现有 pnpm lockfile 和 Vitest。
- GitHub Token 只能保存在 Cloudflare Worker Secret，不能进入前端代码或浏览器存储。
- 同步密码只保存在 `sessionStorage`，Worker URL 可保存在 `localStorage`。
- 数据仓库固定为 `yatxuan123/Overtime-Record-Data`，文件固定为 `data/overtime-records.json`。
- 云端为准，但网络失败不能阻止本地录入。
- 所有写入使用 GitHub 文件 SHA；冲突最多自动合并并重试一次。
- 删除记录必须写入 tombstone，防止旧设备恢复已删除数据。
- 现有 `overtime-records-v1` 数据必须无损迁移。

---

### Task 1: 同步数据模型与冲突合并

**Files:**
- Create: `src/sync/types.ts`
- Create: `src/sync/data.ts`
- Create: `src/sync/data.test.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `SyncRecord`, `SyncEnvelope`, `emptyEnvelope()`, `normalizeEnvelope(value)`, `mergeEnvelopes(local, remote)`。

- [ ] **Step 1: Write failing merge tests**

在 `src/sync/data.test.ts` 覆盖：不同 ID 同时保留；同一 ID 选择较新的 `updatedAt`；较新的 tombstone 删除记录；较旧 tombstone 不删除新记录；输出按日期倒序且信封版本为 1。

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm exec vitest run src/sync/data.test.ts`

Expected: FAIL，因为 `data.ts` 和导出函数尚不存在。

- [ ] **Step 3: Implement minimal types and merge functions**

定义：

```ts
export type SyncRecord = OvertimeRecord & { updatedAt: string }

export type SyncEnvelope = {
  version: 1
  updatedAt: string
  records: SyncRecord[]
  tombstones: Record<string, string>
}
```

`mergeEnvelopes` 使用 `Map<string, SyncRecord>` 合并记录，并使用 ISO 时间字符串比较记录和 tombstone。返回值的 `updatedAt` 使用参与合并的最新时间，不读取系统时间，保证纯函数可重复测试。

- [ ] **Step 4: Run focused tests and full tests**

Run: `pnpm exec vitest run src/sync/data.test.ts && pnpm test`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/sync/types.ts src/sync/data.ts src/sync/data.test.ts
git commit -m "feat(sync): 增加同步数据模型与冲突合并"
```

### Task 2: 本地缓存和旧数据迁移

**Files:**
- Modify: `src/storage.ts`
- Create: `src/storage.test.ts`

**Interfaces:**
- Consumes: `SyncEnvelope`, `SyncRecord`, `emptyEnvelope()`, `normalizeEnvelope()`。
- Produces: `loadSyncCache(storage, now)`, `saveSyncCache(storage, cache)`, `loadWorkerUrl(storage)`, `saveWorkerUrl(storage, url)`, `loadSessionPassword(storage)`, `saveSessionPassword(storage, password)`。

- [ ] **Step 1: Write failing storage tests**

使用内存实现的 `Storage` 替身覆盖：读取新版同步缓存；旧数组迁移并补充确定的 `updatedAt`；损坏 JSON 返回空信封；保存缓存；Worker URL 位于 local storage；同步密码位于 session storage。

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm exec vitest run src/storage.test.ts`

Expected: FAIL，因为新接口尚不存在。

- [ ] **Step 3: Implement storage migration**

使用新键 `overtime-sync-v1` 保存：

```ts
export type SyncCache = {
  envelope: SyncEnvelope
  sha: string | null
  isDirty: boolean
}
```

旧键 `overtime-records-v1` 只读迁移，不删除。旧记录的 `updatedAt` 使用传入的 `now`，然后通过现有校验和加班时长修正逻辑规范化。

- [ ] **Step 4: Run focused tests and full tests**

Run: `pnpm exec vitest run src/storage.test.ts && pnpm test`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/storage.ts src/storage.test.ts
git commit -m "feat(sync): 支持本地同步缓存与旧数据迁移"
```

### Task 3: Worker HTTP 客户端

**Files:**
- Create: `src/sync/client.ts`
- Create: `src/sync/client.test.ts`

**Interfaces:**
- Consumes: `SyncEnvelope`。
- Produces: `CloudSyncClient`, `CloudSyncError`, `CloudSnapshot`。

```ts
export type CloudSnapshot = { sha: string | null; data: SyncEnvelope }

export interface CloudSyncClient {
  load(signal?: AbortSignal): Promise<CloudSnapshot>
  save(snapshot: CloudSnapshot, signal?: AbortSignal): Promise<CloudSnapshot>
}
```

- [ ] **Step 1: Write failing client tests**

通过注入 `fetch` 覆盖：GET 的 URL 和 Authorization header；PUT 请求体；401 转换为 `CloudSyncError('unauthorized')`；409 错误携带最新快照；非 JSON 502 转换为可显示错误；URL 去除尾部斜杠。

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm exec vitest run src/sync/client.test.ts`

Expected: FAIL，因为客户端尚不存在。

- [ ] **Step 3: Implement fetch client**

提供 `createCloudSyncClient({ baseUrl, password, fetchImpl })`。每次请求设置 `Accept: application/json`，PUT 额外设置 `Content-Type: application/json`。错误消息不得包含密码或 Authorization header。

- [ ] **Step 4: Run focused tests and full tests**

Run: `pnpm exec vitest run src/sync/client.test.ts && pnpm test`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/sync/client.ts src/sync/client.test.ts
git commit -m "feat(sync): 增加 Worker 云同步客户端"
```

### Task 4: 同步控制器

**Files:**
- Create: `src/sync/controller.ts`
- Create: `src/sync/controller.test.ts`

**Interfaces:**
- Consumes: `SyncCache`, `CloudSyncClient`, `mergeEnvelopes()`。
- Produces: `SyncController`, `SyncStatus`, `SyncState`。

```ts
export type SyncStatus = 'disconnected' | 'syncing' | 'synced' | 'pending' | 'conflict' | 'unauthorized'

export type SyncState = {
  cache: SyncCache
  status: SyncStatus
  message: string
}
```

- [ ] **Step 1: Write failing controller tests**

覆盖：连接后拉取云端；本地修改立即落盘并上传；网络失败状态为 pending 且缓存保持 dirty；409 合并后只重试一次；401 状态为 unauthorized；多次快速修改不会并发保存且最终上传最新快照；删除生成 tombstone。

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm exec vitest run src/sync/controller.test.ts`

Expected: FAIL，因为控制器尚不存在。

- [ ] **Step 3: Implement controller**

构造函数注入客户端、初始缓存、持久化回调和 `now()`。暴露 `subscribe`、`getState`、`connect`、`replaceRecords`、`deleteRecord`、`retry`。内部使用单个 `syncPromise` 串行化上传；同步期间再次修改只设置 dirty，并在当前请求结束后继续上传最新快照。

- [ ] **Step 4: Run focused tests and full tests**

Run: `pnpm exec vitest run src/sync/controller.test.ts && pnpm test`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/sync/controller.ts src/sync/controller.test.ts
git commit -m "feat(sync): 实现离线优先同步控制器"
```

### Task 5: React 同步状态和连接界面

**Files:**
- Create: `src/sync/useCloudSync.ts`
- Create: `src/sync/useCloudSync.test.ts`
- Create: `src/components/SyncControl.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `SyncController`, storage helpers, `createCloudSyncClient()`。
- Produces: `useCloudSync()` 返回记录、同步状态、连接配置和记录修改操作。

- [ ] **Step 1: Add a failing integration assertion**

在 `src/sync/useCloudSync.test.ts` 测试不依赖 DOM 的初始化工厂：未配置 URL 时为 disconnected；配置 URL 和 session password 时创建客户端并自动 connect；断开时清除 session password，但保留本地缓存。

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm exec vitest run src/sync/useCloudSync.test.ts`

Expected: FAIL，因为初始化工厂尚不存在。

- [ ] **Step 3: Implement hook and UI**

`SyncControl` 使用紧凑状态按钮打开设置面板。面板字段包括 Worker URL 和同步密码，命令包括连接、立即同步、断开。密码输入不回显已有值。状态文案必须明确“本地已保存”或“云端已同步”。

`App` 将原有 `loadRecords/saveRecords` 调用替换为 hook 返回的记录操作。新增/编辑写入新的 `updatedAt`，删除调用 tombstone 接口。页脚根据同步状态显示数据位置。

- [ ] **Step 4: Verify tests and build**

Run: `pnpm test && pnpm run build`

Expected: PASS，且构建产物不包含 GitHub Token 或默认同步密码。

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/styles.css src/components/SyncControl.tsx src/sync/useCloudSync.ts src/sync/useCloudSync.test.ts
git commit -m "feat(sync): 接入云同步状态与连接界面"
```

### Task 6: Cloudflare Worker GitHub API

**Files:**
- Create: `worker/src/index.ts`
- Create: `worker/src/index.test.ts`
- Create: `worker/wrangler.toml`
- Create: `worker/tsconfig.json`

**Interfaces:**
- Consumes: GitHub Contents API。
- Produces: `GET /records`, `PUT /records`, `OPTIONS /records`。

- [ ] **Step 1: Write failing Worker tests**

使用原生 `Request`、`Response` 和注入的 `fetch` 覆盖：OPTIONS CORS；错误来源 403；错误密码 401；缺失文件返回空信封；有效 GitHub base64 内容解码；PUT SHA 一致时更新；SHA 不一致时返回 409 最新快照；非法数据 400；超过 256 KiB 返回 413。

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm exec vitest run worker/src/index.test.ts`

Expected: FAIL，因为 Worker 尚不存在。

- [ ] **Step 3: Implement Worker**

环境接口：

```ts
export type Env = {
  GITHUB_TOKEN: string
  SYNC_PASSWORD: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  GITHUB_BRANCH: string
  DATA_PATH: string
  ALLOWED_ORIGIN: string
}
```

使用 Web API 的 `btoa/atob` 处理 UTF-8 JSON，GitHub 请求必须设置 `Authorization: Bearer`、`Accept: application/vnd.github+json`、`X-GitHub-Api-Version: 2022-11-28`。提交消息固定为 `chore(data): 同步加班记录`。

- [ ] **Step 4: Run Worker tests and project checks**

Run: `pnpm exec vitest run worker/src/index.test.ts && pnpm test && pnpm run build`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add worker/src/index.ts worker/src/index.test.ts worker/wrangler.toml worker/tsconfig.json
git commit -m "feat(worker): 实现 GitHub 私有数据代理"
```

### Task 7: 配置与审批操作文档

**Files:**
- Create: `docs/github-cloud-sync-setup.md`
- Modify: `README.md` if it exists; otherwise do not create a general README solely for this task.

**Interfaces:**
- Consumes: Worker 环境变量和前端连接面板。
- Produces: 用户可逐步完成的 GitHub、Cloudflare 和页面连接审批清单。

- [ ] **Step 1: Write setup instructions**

文档必须包含：创建私有仓库；创建 Fine-grained PAT 且只授权单仓库 Contents read/write；创建 Worker；复制 Worker 源码或使用 Wrangler 的两种部署方式；配置普通变量和 Secrets；生成高强度同步密码；首次连接和迁移；撤销 Token；故障排查；明确哪些操作会产生外部变更。

- [ ] **Step 2: Verify commands and secret hygiene**

检查文档不包含真实 Token、真实同步密码或可误复制的占位密钥。运行：

```bash
rg -n "github_pat_|ghp_|SYNC_PASSWORD\s*=|GITHUB_TOKEN\s*=" docs worker src
```

只允许出现变量名和明确的示例占位说明。

- [ ] **Step 3: Run final verification**

Run: `pnpm test && pnpm run build && git diff --check`

Expected: 全部通过。

- [ ] **Step 4: Commit**

```bash
git add docs/github-cloud-sync-setup.md
git commit -m "docs(sync): 添加云同步配置与审批指南"
```
