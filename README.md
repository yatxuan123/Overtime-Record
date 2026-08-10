# 加班有数

一个用于记录加班日期和打车费用的前端应用，数据默认保存在浏览器本地，也支持手动保存到 GitHub 仓库中的 JSON 文件。

## 功能

- 记录加班日期、是否打车、打车费用和打车方式。
- 打车方式支持：的士、滴滴、高德和其他自定义方式。
- 打车报销状态支持：未申报、已申报、已到账。
- 按月或按年查看日历总览。
- 明细跟随当前月份或年份筛选，并按每页 8 条分页显示。
- 顶部统计当前周期的加班天数、打车天数和打车费用。
- GitHub 数据只在手动点击“读取 GitHub”或“保存 GitHub”时访问。

## 本地运行

环境要求：Node.js 和 pnpm。

```bash
pnpm install
pnpm run dev
```

打开终端显示的本地地址即可访问。

## GitHub 数据配置

默认远程数据文件为：

```text
https://raw.githubusercontent.com/yatxuan123/Overtime-Record/main/data/overtime-records.json
```

读取公开 JSON 不需要 Token。保存数据时需要一个具备目标仓库 `Contents: Read and write` 权限的 GitHub Personal Access Token。Token 只保存在当前浏览器会话中，关闭浏览器后需要重新输入。

保存流程：

1. 在页面点击“保存 GitHub”。
2. 输入 GitHub Token。
3. 点击确认，应用通过 GitHub Contents API 更新 JSON 文件。

应用不会自动同步，也不使用 Wrangler、Cloudflare Worker 或 Git 命令保存数据。

## 构建检查

```bash
pnpm test
pnpm run build
```

## 部署

项目是 Vite 静态站点，构建产物位于 `dist/`。当前 GitHub Pages 地址：

<https://yatxuan123.github.io/Overtime-Record/>
