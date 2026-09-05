import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SummaryCards } from './SummaryCards'

describe('SummaryCards', () => {
  it('renders total pending amount and comp-time total as clickable entries', () => {
    const markup = renderToStaticMarkup(
      <SummaryCards
        days={3}
        taxiDays={2}
        taxiCost={120}
        taxiPaidCost={20}
        taxiPendingCost={100}
        allPendingCost={240}
        compTimeDays={1}
        totalCompTimeDays={4}
        periodLabel="本月"
        onPendingClick={() => undefined}
        onCompTimeClick={() => undefined}
      />,
    )

    expect(markup).toContain('未到账总费用')
    expect(markup).toContain('¥240')
    expect(markup).toContain('累计可调休')
    expect(markup).toContain('>4 天</strong>')
    expect(markup).toContain('查看未到账总费用明细')
    expect(markup).toContain('查看累计调休明细')
  })
})
