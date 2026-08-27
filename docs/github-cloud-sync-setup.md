# GitHub 远程数据配置

应用默认把数据保存在浏览器 `localStorage`。输入并记住 GitHub Token 后，新增、编辑、覆盖和删除记录都会自动提交到当前公开仓库中的 JSON 文件：

```text
https://raw.githubusercontent.com/yatxuan123/Overtime-Record/main/data/overtime-records.json
```

## 读取 GitHub

点击“读取 GitHub”时，网页会请求上面的公开 JSON 地址。读取成功后，确认替换本地记录，数据仍会同时保存到当前浏览器。

没有 GitHub Token 也可以读取。

## 保存 GitHub

点击“保存 GitHub”，在弹窗中输入 GitHub Fine-grained Token。Token 只保存在当前浏览器会话中，之后的记录变更会自动保存。手动按钮和自动保存使用同一套流程：

1. 读取 `data/overtime-records.json` 当前版本 SHA。
2. 解码 JSON 并比较远程 `version` 与本地最近一次读取的版本。
3. 版本一致时，将版本号加一，用 `PUT /repos/yatxuan123/Overtime-Record/contents/data/overtime-records.json` 提交 JSON。
4. GitHub 自动创建一次 commit。

版本不一致时会拒绝覆盖，并提示先点击“读取 GitHub”获取最新数据，再继续保存。网络失败或没有 Token 时，本地数据仍会保留。

## Token 权限

在 GitHub 创建 Fine-grained Token：

- Repository access：`Only select repositories`
- 选择：`yatxuan123/Overtime-Record`
- Repository permissions → Contents：`Read and write`
- 其他权限全部关闭

Token 只在创建成功页面显示一次。不要把 Token 写入代码、提交记录或聊天消息。

## 数据公开提示

当前项目仓库是公开的，因此以下内容任何人都可以查看：

- 加班日期
- 加班时长
- 打车费用
- 备注
- Git 提交历史和旧版本

不要在备注中填写密码、账号、客户信息或其他敏感内容。

## 远程文件不存在时

第一次点击“保存 GitHub”时，如果 `data/overtime-records.json` 尚不存在，API 会自动创建该文件。文件内容使用版本对象：

```json
{
  "version": 1,
  "records": [
    {
      "id": "example",
      "date": "2026-08-08",
      "tookTaxi": false,
      "taxiCost": 0,
      "reimbursementStatus": "unsubmitted",
      "reimbursementPaidAt": "",
      "note": ""
    }
  ]
}
```

## 常见问题

| 状态 | 原因 | 处理 |
|---|---|---|
| 读取失败 | 文件地址或网络不可用 | 检查 GitHub 文件是否存在 |
| Token 无效 | Token 过期或权限不足 | 重新创建 Contents read/write Token |
| 文件已被其他操作更新 | SHA 冲突 | 重新读取 GitHub 后再保存 |
| 本地数据仍在 | 远程操作失败 | 本地数据不会被自动删除 |
