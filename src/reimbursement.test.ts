import { describe, expect, it } from 'vitest'
import { createReimbursementBatch, getEligibleReimbursementRecords, getNextReimbursementPeriod, getReconciliationStatus, settleReimbursementBatch, submitReimbursementBatch } from './reimbursement'
import type { OvertimeRecord, ReimbursementBatch } from './types'

const record = (id: string, date: string, taxiCost: number, extra: Partial<OvertimeRecord> = {}): OvertimeRecord => ({ id, date, tookTaxi: true, taxiCost, taxiProvider: 'didi', reimbursementStatus: 'unsubmitted', note: '', ...extra })

describe('reimbursement batches', () => {
  it('starts on the previous claim date so same-day night overtime enters the next batch', () => {
    const previous: ReimbursementBatch = { id: 'previous', periodStart: '2026-08-01', periodEnd: '2026-09-23', recordIds: [], expectedAmount: 0, status: 'submitted', submittedAt: '2026-09-23' }
    expect(getNextReimbursementPeriod([previous], '2026-11-05')).toEqual({ start: '2026-09-23', end: '2026-11-05' })
  })

  it('selects only unbatched unpaid taxi records inside the period', () => {
    const records = [
      record('same-day-night', '2026-09-23', 10),
      record('first', '2026-09-24', 20),
      record('last', '2026-11-05', 30),
      record('after', '2026-11-06', 40),
      record('batched', '2026-10-01', 50, { reimbursementBatchId: 'old' }),
      record('paid', '2026-10-02', 60, { reimbursementStatus: 'paid' }),
      { id: 'walk', date: '2026-10-03', tookTaxi: false, taxiCost: 0, note: '' },
    ]
    expect(getEligibleReimbursementRecords(records, [], { start: '2026-09-23', end: '2026-11-05' }).map((item) => item.id)).toEqual(['same-day-night', 'first', 'last'])
  })

  it('creates and submits one batch without mutating source records', () => {
    const records = [record('a', '2026-09-24', 20), record('b', '2026-10-01', 30)]
    const batch = createReimbursementBatch(records, { start: '2026-09-24', end: '2026-11-05' }, '2026-11-05')
    expect(batch).toMatchObject({ periodStart: '2026-09-24', periodEnd: '2026-11-05', recordIds: ['a', 'b'], expectedAmount: 50, status: 'draft' })
    expect(records.every((item) => item.reimbursementBatchId === undefined)).toBe(true)
    expect(submitReimbursementBatch(batch, '2026-11-06')).toMatchObject({ status: 'submitted', submittedAt: '2026-11-06' })
  })

  it('classifies exact, short and over payment amounts', () => {
    expect(getReconciliationStatus(100, undefined)).toBe('unrecorded')
    expect(getReconciliationStatus(100, 100)).toBe('matched')
    expect(getReconciliationStatus(100, 99.5)).toBe('short_paid')
    expect(getReconciliationStatus(100, 100.5)).toBe('overpaid')
    expect(getReconciliationStatus(0.1 + 0.2, 0.3)).toBe('matched')
  })

  it('settles a submitted batch once with the actual paid amount', () => {
    const batch: ReimbursementBatch = { id: 'batch', periodStart: '2026-09-24', periodEnd: '2026-11-05', recordIds: ['a'], expectedAmount: 100, status: 'submitted', submittedAt: '2026-11-06' }
    expect(settleReimbursementBatch(batch, 99.5, '2026-11-20')).toMatchObject({ status: 'paid', actualPaidAmount: 99.5, paidAt: '2026-11-20', reconciliation: 'short_paid' })
  })
})
