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
