import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SummaryDetailModal } from './SummaryDetailModal'
import type { OvertimeRecord } from '../types'

const records: OvertimeRecord[] = [
  { id: 'pending', date: '2026-08-03', tookTaxi: true, taxiCost: 103.5, taxiProvider: 'didi', reimbursementStatus: 'submitted', note: '' },
  { id: 'comp', date: '2026-08-08', tookTaxi: true, taxiCost: 30, taxiProvider: 'taxi', reimbursementStatus: 'paid', note: '' },
]

describe('SummaryDetailModal', () => {
  it('renders all pending reimbursement details', () => {
    const markup = renderToStaticMarkup(<SummaryDetailModal mode="pending" records={records} onClose={() => undefined} onEdit={() => undefined} />)

    expect(markup).toContain('未到账费用明细')
    expect(markup).toContain('2026-08-03')
    expect(markup).toContain('¥103.5')
    expect(markup).toContain('共 1 笔未到账')
    // 状态用带颜色的徽章展示，和加班明细列表里的样式保持一致。
    expect(markup).toContain('record-status record-status--submitted')
  })

  it('lists unsubmitted and rejected fares alongside submitted ones', () => {
    const mixed: OvertimeRecord[] = [
      { id: 'submitted', date: '2026-08-03', tookTaxi: true, taxiCost: 100, taxiProvider: 'didi', reimbursementStatus: 'submitted', note: '' },
      { id: 'unsubmitted', date: '2026-08-04', tookTaxi: true, taxiCost: 20, taxiProvider: 'taxi', reimbursementStatus: 'unsubmitted', note: '' },
      { id: 'rejected', date: '2026-08-05', tookTaxi: true, taxiCost: 30, taxiProvider: 'amap', reimbursementStatus: 'rejected', note: '' },
    ]

    const markup = renderToStaticMarkup(<SummaryDetailModal mode="pending" records={mixed} onClose={() => undefined} onEdit={() => undefined} />)

    expect(markup).toContain('共 3 笔未到账 · 已申报 1 · 被驳回 1 · 未申报 1')
    // 非已申报的记录不能沿用「已等待 N 天」。
    expect(markup).toContain('尚未申报')
    expect(markup).toContain('需重新提交')
    expect(markup).toContain('record-status--unsubmitted')
    expect(markup).toContain('record-status--rejected')
    // 顶部总额必须等于各行相加，这才说明列表口径与总额口径一致。
    expect(markup).toContain('¥150')
  })

  it('renders all comp-time details', () => {
    const markup = renderToStaticMarkup(<SummaryDetailModal mode="comp-time" records={records} onClose={() => undefined} onEdit={() => undefined} />)

    expect(markup).toContain('调休明细')
    expect(markup).toContain('2026-08-08')
    expect(markup).toContain('共 1 天调休')
    expect(markup).toContain('调休 1 天')
    expect(markup).not.toContain('2026-08-03')
  })
})
