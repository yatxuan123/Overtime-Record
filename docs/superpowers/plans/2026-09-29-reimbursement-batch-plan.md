# 加班打车批次报销改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在保留历史单笔报销流程的前提下，支持按申报周期一次生成、提交和核对打车报销批次。

**Architecture:** 在现有 `records` 之外增加可选的 `reimbursementBatches` 和 `reimbursementPolicy` 快照字段。没有 `reimbursementBatchId` 的旧记录继续走旧状态逻辑；新流程使用批次作为申报和到账的主要操作对象，记录状态由批次关联结果展示。

**Tech Stack:** React、TypeScript、Vite、Vitest、浏览器 `localStorage`、GitHub Contents API。

**Spec:** `docs/superpowers/specs/2026-09-29-reimbursement-batch-design.md`

## Global Constraints

- 不删除或重解释已有 `reimbursementStatus`、`reimbursementPaidAt` 字段。
- 旧数组 JSON、只有 `records` 的 JSON、没有批次 ID 的历史记录必须继续可读。
- 申报周期截止日当天包含在本批次；下一批从上次申报日当天开始，以纳入申报日晚上新增的打车记录，已关联上一批的记录自动排除。
- 被驳回批次不自动进入下一批。
- 不新增依赖，不改变每日一条加班记录的规则。
- 修改前使用测试先行：先写失败测试，再实现最小代码。

## Review Focus

- 旧数组 JSON 加载后不能因为新增批次字段而丢失记录：由 Task 1 的远程/存储兼容测试覆盖。
- 同一条记录不能被重复纳入两个批次：由 Task 2 的候选筛选测试覆盖。
- 截止日当天必须被纳入本批次，截止日次日不能被纳入：由 Task 2 的周期测试覆盖。
- 实际到账金额为小数、少到账或多到账时，差额和状态必须稳定：由 Task 2 的核对测试覆盖。
- 旧的单笔 `submitted` 记录仍按旧等待天数逻辑展示：由 Task 3 的兼容统计测试覆盖。

### Task 1: 扩展快照数据模型并保持旧数据兼容

**Files:**
- Modify: `src/types.ts`
- Modify: `src/storage.ts`
- Modify: `src/remote.ts`
- Test: `src/storage.test.ts`
- Test: `src/remote.test.ts`

**Interfaces:**
- Produce `ReimbursementBatch`, `ReimbursementPolicy`, `ReimbursementBatchStatus`, and `ReimbursementSnapshot` types.
- Produce `loadReimbursementSnapshot()` and `saveReimbursementSnapshot()` while retaining `loadRecords()` and `saveRecords()` wrappers.
- Extend `RemoteRecordsSnapshot` with optional `reimbursementBatches` and `reimbursementPolicy`.

- [ ] **Step 1: Write failing compatibility tests**

Add tests asserting that an old array loads as `{ records, reimbursementBatches: [], reimbursementPolicy: { mode: 'legacy' } }`, and that a new snapshot round-trips one batch and one policy through storage/remote parsing.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `pnpm vitest run src/storage.test.ts src/remote.test.ts`

Expected: FAIL because the snapshot types and loaders do not yet exist.

- [ ] **Step 3: Implement the minimal model and adapters**

Add optional `reimbursementBatchId` to `OvertimeRecord`; add snapshot types; make old parsers default missing metadata to empty batches and legacy mode; persist the complete snapshot in local storage while keeping existing record-only wrappers.

- [ ] **Step 4: Run focused and full tests**

Run: `pnpm vitest run src/storage.test.ts src/remote.test.ts` and then `pnpm test`.

Expected: all existing tests remain green.

### Task 2: Add pure batch domain operations

**Files:**
- Create: `src/reimbursement.ts`
- Modify: `src/reimbursement.test.ts`
- Modify: `src/records.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Produce `getNextReimbursementPeriod(records, batches, nextClaimDate)`.
- Produce `getEligibleReimbursementRecords(records, batches, period)`.
- Produce `createReimbursementBatch(records, period, now)`.
- Produce `submitReimbursementBatch(batch, submittedAt)`.
- Produce `settleReimbursementBatch(batch, actualPaidAmount, paidAt)`.
- Produce `getReconciliationStatus(expected, actual)`.

- [ ] **Step 1: Write failing domain tests**

Cover: period starts at previous `periodEnd + 1`; `periodEnd` is included; records already carrying a batch ID are excluded; non-taxi and paid records are excluded; expected amount is the sum of selected taxi costs; settlement returns matched, short-paid, and overpaid results; repeated settlement rejects invalid dates or negative amounts.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `pnpm vitest run src/reimbursement.test.ts`

Expected: FAIL because `src/reimbursement.ts` does not exist.

- [ ] **Step 3: Implement minimal pure functions**

Keep all date comparisons in `YYYY-MM-DD` string form, sort selected records by date, generate IDs through the existing `createRecordId`, and do not mutate input arrays.

- [ ] **Step 4: Run focused and full tests**

Run: `pnpm vitest run src/reimbursement.test.ts` and `pnpm test`.

Expected: all tests pass.

### Task 3: Update statistics and exports without breaking legacy records

**Files:**
- Modify: `src/records.ts`
- Modify: `src/export.ts`
- Test: `src/records.test.ts`
- Test: `src/export.test.ts`

**Interfaces:**
- Produce batch-aware summary helpers for pending-claim amount, submitted-batch amount, and reconciliation entries.
- Preserve `getPendingReimbursements`, `sumPendingReimbursementAmount`, and legacy timing behavior for records without batch IDs.

- [ ] **Step 1: Write failing statistics/export tests**

Assert that record-level pending totals remain unchanged; batch totals appear once; legacy submitted records still calculate waiting days from record date; batch timing uses `submittedAt` to `paidAt`; CSV and JSON include batch ID, period, expected amount, actual amount, and difference.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm vitest run src/records.test.ts src/export.test.ts`

Expected: FAIL on the new batch assertions while legacy assertions remain informative.

- [ ] **Step 3: Implement batch-aware helpers and export columns**

Keep monthly/yearly taxi cost attribution based on each overtime record date. Add batch summary data separately so a cross-month batch does not duplicate expense totals.

- [ ] **Step 4: Run focused and full tests**

Run: `pnpm vitest run src/records.test.ts src/export.test.ts` and `pnpm test`.

Expected: all tests pass.

### Task 4: Add batch management UI and wire complete snapshot persistence

**Files:**
- Create: `src/components/ReimbursementPanel.tsx`
- Create: `src/components/ReimbursementBatchModal.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/RecordList.tsx`
- Modify: `src/components/OvertimeForm.tsx`
- Modify: `src/styles.css`
- Test: `src/components/ReimbursementPanel.test.tsx`
- Test: `src/components/RecordList.test.tsx`

**Interfaces:**
- `ReimbursementPanel` consumes records, batches, policy, and callbacks for create/submit/settle.
- `ReimbursementBatchModal` displays selected records, expected amount, and settlement reconciliation.
- `App` owns snapshot state and persists records, batches, and policy together.

- [ ] **Step 1: Write failing component tests**

Cover rendering of next claim date and eligible amount; one-click batch generation; submit action changing one batch instead of each record; settlement showing matched/short-paid/overpaid; legacy record edit retaining the old status controls.

- [ ] **Step 2: Run focused component tests and verify failure**

Run: `pnpm vitest run src/components/ReimbursementPanel.test.tsx src/components/RecordList.test.tsx`

Expected: FAIL because the new components and props do not exist.

- [ ] **Step 3: Implement UI and state wiring**

Add a compact reimbursement panel near the summary cards, a modal for reviewing and submitting a batch, and a settlement form for actual amount/date. New records show derived batch status; records without a batch keep the existing status radio controls.

- [ ] **Step 4: Update remote save/load callbacks**

Pass the complete snapshot through local storage and GitHub save/load. Keep the existing version conflict behavior and do not write tokens or sensitive data into the new fields.

- [ ] **Step 5: Run component and full tests**

Run: `pnpm vitest run src/components/ReimbursementPanel.test.tsx src/components/RecordList.test.tsx` and `pnpm test`.

Expected: all tests pass.

### Task 5: Build verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `src/remote.test.ts` if build-compatible fixtures need adjustment

- [ ] **Step 1: Update user-facing documentation**

Document the batch workflow, cutoff inclusion rule, reconciliation states, legacy record behavior, and the expanded JSON shape.

- [ ] **Step 2: Run the complete verification commands**

Run: `pnpm test && pnpm run build`

Expected: all tests pass and TypeScript/Vite build completes successfully.

- [ ] **Step 3: Review the final diff**

Run: `git diff --check` and `git status --short`.

Expected: only the batch feature files and approved design/plan documents are changed; no generated artifacts or credentials are included.
