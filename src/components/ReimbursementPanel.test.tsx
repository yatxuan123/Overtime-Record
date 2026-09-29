import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReimbursementPanel } from './ReimbursementPanel'
import type { OvertimeRecord, ReimbursementBatch, ReimbursementPolicy } from '../types'

const records: OvertimeRecord[] = [{ id: 'taxi-1', date: '2026-09-24', tookTaxi: true, taxiCost: 120, taxiProvider: 'didi', reimbursementStatus: 'unsubmitted', note: '' }]
const policy: ReimbursementPolicy = { mode: 'batch', lastClaimDate: '2026-09-23', nextClaimDate: '2026-11-05' }

describe('ReimbursementPanel', () => {
  it('shows the next claim date and eligible total', () => {
    const markup = renderToStaticMarkup(<ReimbursementPanel records={records} batches={[]} policy={policy} onUpdate={() => undefined} />)
    expect(markup).toContain('下一次申报：2026-11-05')
    expect(markup).toContain('待申报 1 笔')
    expect(markup).toContain('¥120')
    expect(markup).toContain('生成本期申报')
  })

  it('shows one settlement action for a submitted batch', () => {
    const batch: ReimbursementBatch = { id: 'batch-1', periodStart: '2026-09-24', periodEnd: '2026-11-05', recordIds: ['taxi-1'], expectedAmount: 120, submittedAt: '2026-11-06', status: 'submitted' }
    const markup = renderToStaticMarkup(<ReimbursementPanel records={records} batches={[batch]} policy={policy} onUpdate={() => undefined} />)
    expect(markup).toContain('已申报待到账')
    expect(markup).toContain('登记本批次到账')
  })
})
