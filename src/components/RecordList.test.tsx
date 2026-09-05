import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RecordList } from './RecordList'
import type { OvertimeRecord } from '../types'

describe('RecordList', () => {
  it('renders the total pending amount as a details entry point', () => {
    const records: OvertimeRecord[] = [{
      id: 'pending-1',
      date: '2026-08-03',
      tookTaxi: true,
      taxiCost: 103.5,
      taxiProvider: 'didi',
      reimbursementStatus: 'submitted',
      note: '',
    }]

    const markup = renderToStaticMarkup(
      <RecordList
        records={records}
        period="2026-08"
        periodLabel="2026年8月"
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    )

    expect(markup).toContain('未到账总费用')
    expect(markup).toContain('查看未到账费用明细')
    expect(markup).toContain('¥103.5')
  })
})
