# 加班打车批次报销改造设计

## 背景

当前系统将报销状态保存在单条加班记录上，用户需要逐条把 9 月 24 日以后产生的打车记录改成“已申报”，到账后还需要逐条改成“已到账”。实际业务已经变为按申报周期批量提交、一次性到账，并需要核对预计报销金额与实际到账金额。

## 目标

- 支持按申报周期一次生成并提交一个报销批次。
- 自动汇总上次申报日之后至本次截止日的未申报打车记录。
- 批次只需录入一次到账日期和实际到账金额。
- 自动计算预计金额、实际到账金额和差额。
- 保留旧记录的单笔报销流程，不强制迁移历史数据。
- 本地存储、GitHub 同步、导出和统计均兼容旧 JSON。

## 非目标

- 本阶段不接入公司财务系统或自动获取银行到账信息。
- 不自动推断历史批次；没有明确批次信息的旧记录保持原状态。
- 不改变加班日期、调休计算和每日唯一记录规则。

## 领域模型

`OvertimeRecord` 保留现有 `reimbursementStatus` 和 `reimbursementPaidAt` 字段，并增加可选的 `reimbursementBatchId`。没有批次 ID 的记录继续按旧流程解释。

新增：

```ts
type ReimbursementBatchStatus = 'draft' | 'submitted' | 'rejected' | 'paid'

type ReimbursementBatch = {
  id: string
  periodStart: string
  periodEnd: string
  recordIds: string[]
  expectedAmount: number
  submittedAt?: string
  actualPaidAmount?: number
  paidAt?: string
  status: ReimbursementBatchStatus
  reconciliation?: 'unrecorded' | 'matched' | 'short_paid' | 'overpaid'
  note?: string
}

type ReimbursementPolicy = {
  mode: 'legacy' | 'batch'
  nextClaimDate?: string
}
```

远程和导出 JSON 使用可选字段：

```json
{
  "version": 43,
  "records": [],
  "reimbursementBatches": [],
  "reimbursementPolicy": {
    "mode": "batch",
    "nextClaimDate": "2026-11-05"
  }
}
```

旧的数组格式和只有 `records` 的对象格式继续可读。

## 批次规则

1. 新流程下日常录入只记录打车信息，记录默认为“待本期申报”。
2. 生成批次时，默认范围为上一个已提交批次的 `periodEnd` 至当前 `nextClaimDate`，两端均包含。申报日白天已提交的记录通过批次 ID 排除，申报日晚上新增的打车记录因此会进入下一批。
3. 默认候选条件为：打车、没有批次 ID、未到账。用户可在确认窗口排除单条记录。
4. 提交批次时写入 `submittedAt`，批次状态变为 `submitted`，不要求逐条修改记录。
5. 录入到账时只填写批次的 `actualPaidAmount` 和 `paidAt`。
6. 差额为 `actualPaidAmount - expectedAmount`，绝对值为零时标记 `matched`，小于零标记 `short_paid`，大于零标记 `overpaid`。
7. 被驳回批次保留为 `rejected`，不自动混入下一批；用户可重新生成批次或继续使用旧的单笔处理方式。

## 界面改造

- 在报销区域增加下一次申报日期、待申报笔数和待申报金额。
- 增加“生成本期申报”操作，展示周期、明细、预计金额并支持排除记录。
- 增加批次列表和批次详情，批次详情提供“提交批次”和“登记到账”。
- 记录列表显示“待本期申报”“已纳入批次”“批次已到账”等批次状态。
- 没有关联批次的历史记录继续显示原有四种状态，并保留单笔编辑入口。

## 统计和导出

- “未到账金额”继续按费用记录汇总，避免破坏现有统计。
- 新增“待本期申报”“已申报待到账”“金额待核对”三个批次口径。
- 新批次的报销时效按 `submittedAt -> paidAt` 计算；历史无批次记录继续使用旧的加班日到到账日口径。
- CSV 增加批次编号、申报周期、批次申报日期、预计金额、实际到账金额和差额列。
- JSON 导出同时包含 `records` 和 `reimbursementBatches`。

## 兼容和存储

- `loadRecords`/`saveRecords` 扩展为可读写完整快照，但保留旧调用的兼容包装。
- 远程同步快照增加可选批次和策略字段；旧远程文件读取后使用空批次和默认 legacy 策略。
- 历史记录不做破坏性迁移；首次启用批次流程只影响之后生成的批次。

## 验收标准

- 一次操作可以把 9 月 24 日至 11 月 5 日的多笔打车记录生成一个批次。
- 提交批次后不需要逐条修改“已申报”。
- 登记一次到账后，批次详情可以显示预计金额、实际金额和差额。
- 批次金额一致、少到账、多到账三种情况均有明确状态。
- 旧数组 JSON、旧记录和旧单笔状态测试全部通过。
- 新增批次逻辑、存储兼容、导出和主要界面流程有自动化测试。
