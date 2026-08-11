import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MonthOverview } from './MonthOverview'
import type { OvertimeRecord } from '../types'

const records: OvertimeRecord[] = [{
  id: 'record-1',
  date: '2026-08-05',
  tookTaxi: true,
  taxiCost: 102,
  taxiProvider: 'taxi',
  taxiProviderOther: '',
  reimbursementStatus: 'paid',
  note: '',
}]

describe('MonthOverview', () => {
  it('renders record states as indicators instead of a fare summary in a day cell', () => {
    const markup = renderToStaticMarkup(
      <MonthOverview
        records={records}
        selectedMonth="2026-08"
        mode="month"
        onMonthChange={() => undefined}
        onModeChange={() => undefined}
        onDateSelect={() => undefined}
      />,
    )

    expect(markup).toContain('calendar-indicator--overtime')
    expect(markup).toContain('calendar-indicator--taxi')
    expect(markup).toContain('calendar-indicator--paid')
    expect(markup).not.toContain('overview-day__meta')
    expect(markup).toContain('aria-label="日历显示方式"')
    expect(markup).toContain('>状态</button>')
    expect(markup).toContain('>文字</button>')
  })
})
