# GitHub 私有仓库云同步设计

## 目标

将加班记录从仅保存在浏览器 `localStorage` 的模式，升级为以 GitHub 私有仓库为云端数据源、浏览器本地缓存为离线副本的个人多设备同步模式。

已确认的约束：

- 应用仍部署在 GitHub Pages。
- 数据仓库使用 `yatxuan123/Overtime-Record-Data`，并设置为私有仓库。
- Cloudflare Worker 负责安全访问 GitHub API。
- 应用仅供一个人使用，通过独立同步密码鉴权。
- 云端数据为准，同时支持离线编辑和恢复联网后的同步。
- GitHub Token 不得进入前端代码、构建产物或浏览器存储。

## 总体架构

```text
GitHub Pages React 应用
  |  Authorization: Bearer <同步密码>
  |  GET/PUT JSON
  v
Cloudflare Worker
  |  Fine-grained GitHub Token
  |  GitHub Contents API
  v
私有仓库 yatxuan123/Overtime-Record-Data
  `- data/overtime-records.json
```

浏览器先读取本地缓存并立即渲染，再异步请求 Worker。云端请求成功后合并本地未同步变更；失败时继续使用本地缓存，并显示等待同步状态。

## 安全设计

Cloudflare Worker Secrets 保存以下敏感配置：

- `GITHUB_TOKEN`：仅授予 `Overtime-Record-Data` 仓库 Contents 读写权限的 Fine-grained PAT。
- `SYNC_PASSWORD`：高强度随机同步密码。

普通环境变量保存：

- `GITHUB_OWNER=yatxuan123`
- `GITHUB_REPO=Overtime-Record-Data`
- `GITHUB_BRANCH=main`
- `DATA_PATH=data/overtime-records.json`
- `ALLOWED_ORIGIN=https://yatxuan123.github.io`

前端首次连接时由用户输入同步密码，并仅保存到当前浏览器的 `sessionStorage`。关闭浏览器会话后需要重新输入。前端每次请求通过 `Authorization: Bearer <同步密码>` 发送。

Worker 必须：

- 校验精确的允许来源，并正确响应 CORS 预检。
- 对同步密码进行恒定时间比较。
- 不在日志或错误响应中输出 Token、同步密码或 GitHub 原始鉴权响应。
- 限制请求体大小，并对数据结构进行验证。
- 只允许操作固定仓库、分支和文件，客户端不能传入这些目标参数。

CORS 仅用于限制浏览器来源，不作为身份认证机制。

## 云端数据结构

`data/overtime-records.json` 使用带版本的信封结构：

```json
{
  "version": 1,
  "updatedAt": "2026-08-06T01:00:00.000Z",
  "records": [
    {
      "id": "uuid",
      "date": "2026-08-06",
      "leaveTime": "21:30",
      "hours": 3.5,
      "tookTaxi": true,
      "taxiCost": 35,
      "note": "项目上线",
      "updatedAt": "2026-08-06T01:00:00.000Z"
    }
  ],
  "tombstones": {
    "deleted-record-id": "2026-08-06T01:02:00.000Z"
  }
}
```

每条记录包含 `updatedAt`。删除操作写入 tombstone，避免另一台设备的旧缓存把已删除记录重新上传。

## Worker API

### `GET /records`

读取 GitHub 文件并返回：

```json
{
  "sha": "github-file-sha",
  "data": {
    "version": 1,
    "updatedAt": "2026-08-06T01:00:00.000Z",
    "records": [],
    "tombstones": {}
  }
}
```

当文件尚不存在时返回空的版本 1 数据和 `sha: null`。

### `PUT /records`

请求体：

```json
{
  "sha": "客户端最后读取的文件 sha 或 null",
  "data": {}
}
```

Worker 在写入前读取当前文件：

- 当前 SHA 与请求 SHA 一致时提交更新。
- SHA 不一致时返回 `409`，并附带当前云端数据和 SHA。
- 文件不存在且请求 SHA 为 `null` 时创建文件。

成功后返回 GitHub 生成的新 SHA 和保存后的数据。

### 错误响应

统一格式：

```json
{
  "error": "unauthorized",
  "message": "同步密码无效"
}
```

主要状态码：`400` 数据无效、`401` 密码无效、`409` 版本冲突、`413` 请求过大、`502` GitHub API 异常。

## 前端同步流程

### 初始化

1. 从 `localStorage` 读取同步信封并立即展示记录。
2. 未配置 Worker URL 或没有会话密码时显示“未连接”。
3. 已有会话密码时请求 `GET /records`。
4. 合并云端数据和本地未同步数据。
5. 若合并结果改变云端内容，使用最新 SHA 上传。

### 本地修改

新增和编辑记录时设置新的 `updatedAt`。删除时移除记录并写入 tombstone。每次操作立即：

1. 更新 React 状态。
2. 保存本地缓存并标记为待同步。
3. 尝试上传云端。

同一时刻只允许一个上传任务。连续修改合并为最新快照，避免并发 PUT 相互覆盖。

### 冲突合并

遇到 `409` 时，前端按记录 ID 合并：

- 同一 ID 选择 `updatedAt` 较新的记录。
- tombstone 时间晚于记录 `updatedAt` 时保留删除结果。
- 双方不同 ID 的记录都保留。
- 合并完成后使用冲突响应中的最新 SHA 重试一次。
- 第二次仍冲突则停止自动重试，显示“同步冲突，请重试”。

### 离线恢复

网络失败不阻止本地录入。应用监听浏览器 `online` 事件，在恢复联网后自动发起同步。用户也可以点击同步状态按钮手动重试。

## 现有数据迁移

首次升级时兼容旧的 `overtime-records-v1` 数组：

1. 读取并验证旧数据。
2. 为每条记录补充 `updatedAt`。
3. 转换为版本 1 同步信封。
4. 在用户连接 Worker 后上传到空的云端文件。
5. 上传成功后保留本地缓存，不立即删除旧键，避免升级失败导致数据丢失。

若云端已有数据，不自动整批覆盖，而是进入正常合并流程。

## UI 变化

顶部区域增加紧凑的同步状态控制：

- 未连接
- 正在同步
- 已同步
- 等待同步
- 同步冲突

点击后打开连接面板，可设置 Worker URL、输入同步密码、手动同步或断开当前会话。错误消息必须说明本地数据是否仍已保存。

页脚从“数据仅保存在当前浏览器”改为反映当前状态的说明。

## 代码边界

- `src/storage.ts`：本地缓存、旧数据迁移和数据校验。
- `src/sync/merge.ts`：纯函数冲突合并。
- `src/sync/client.ts`：Worker HTTP 客户端和错误类型。
- `src/sync/useCloudSync.ts`：同步状态机、串行上传和联网恢复。
- `src/components/SyncControl.tsx`：连接和同步 UI。
- `worker/src/index.ts`：Worker 路由、鉴权、校验和 GitHub Contents API。

同步算法与 React UI 分离，便于独立测试。

## 测试与验证

至少覆盖：

- 旧版 localStorage 数据迁移。
- 云端和本地新增记录合并。
- 同一记录以较新 `updatedAt` 胜出。
- tombstone 防止删除记录复活。
- 401、409 和网络失败的前端状态转换。
- Worker 拒绝错误密码、错误来源和非法数据。
- Worker 正确处理文件不存在、读取、更新和 SHA 冲突。
- 生产构建通过，GitHub Pages 子路径资源正常。

## 不在本次范围

- 多用户账户系统。
- GitHub OAuth 登录。
- 记录附件或图片上传。
- 服务端数据库。
- 自动创建 GitHub 仓库、Token 或 Cloudflare 账号资源。
