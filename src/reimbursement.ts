import { createRecordId, localDateKey } from './overtime'
import type { OvertimeRecord, ReconciliationStatus, ReimbursementBatch } from './types'

export type ReimbursementPeriod = { start: string; end: string }

export function getNextReimbursementPeriod(batches: ReimbursementBatch[], nextClaimDate: string, lastClaimDate?: string): ReimbursementPeriod {
  const submitted = batches
    .filter((batch) => batch.status === 'submitted' || batch.status === 'paid')
    .sort((left, right) => right.periodEnd.localeCompare(left.periodEnd))[0]
  const start = submitted ? submitted.periodEnd : lastClaimDate ?? nextClaimDate
  return { start, end: nextClaimDate }
}

export function getEligibleReimbursementRecords(records: OvertimeRecord[], batches: ReimbursementBatch[], period: ReimbursementPeriod): OvertimeRecord[] {
  const batchRecordIds = new Set(batches.flatMap((batch) => batch.recordIds))
  return records
    .filter((record) => record.tookTaxi && record.date >= period.start && record.date <= period.end)
    .filter((record) => !record.reimbursementBatchId && !batchRecordIds.has(record.id))
    .filter((record) => (record.reimbursementStatus ?? 'unsubmitted') === 'unsubmitted')
    .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
}

export function createReimbursementBatch(records: OvertimeRecord[], period: ReimbursementPeriod, now = localDateKey()): ReimbursementBatch {
  if (records.length === 0) throw new Error('不能创建空的报销批次')
  if (period.start > period.end) throw new Error('报销周期无效')
  return {
    id: createRecordId(),
    periodStart: period.start,
    periodEnd: period.end,
    recordIds: records.map((record) => record.id),
    expectedAmount: records.reduce((sum, record) => sum + record.taxiCost, 0),
    status: 'draft',
    note: `创建于 ${now}`,
  }
}

export function submitReimbursementBatch(batch: ReimbursementBatch, submittedAt = localDateKey()): ReimbursementBatch {
  if (batch.status !== 'draft') throw new Error('只有草稿批次可以提交')
  if (submittedAt < batch.periodEnd) throw new Error('申报日期不能早于报销周期截止日')
  return { ...batch, status: 'submitted', submittedAt }
}

export function settleReimbursementBatch(batch: ReimbursementBatch, actualPaidAmount: number, paidAt = localDateKey()): ReimbursementBatch {
  if (batch.status !== 'submitted') throw new Error('只有已申报批次可以登记到账')
  if (!Number.isFinite(actualPaidAmount) || actualPaidAmount < 0) throw new Error('实际到账金额无效')
  if (!batch.submittedAt || paidAt < batch.submittedAt) throw new Error('到账日期不能早于申报日期')
  return { ...batch, status: 'paid', actualPaidAmount, paidAt, reconciliation: getReconciliationStatus(batch.expectedAmount, actualPaidAmount) }
}

export function getReconciliationStatus(expectedAmount: number, actualPaidAmount: number | undefined): ReconciliationStatus {
  if (actualPaidAmount === undefined) return 'unrecorded'
  const expectedCents = Math.round(expectedAmount * 100)
  const actualCents = Math.round(actualPaidAmount * 100)
  if (actualCents === expectedCents) return 'matched'
  return actualCents < expectedCents ? 'short_paid' : 'overpaid'
}
