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
        taxiPendingCost={100}
        allPendingCost={240}
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

  it('hides the paid-cost and current-period comp-time cards', () => {
    const markup = renderToStaticMarkup(
      <SummaryCards
        days={3}
        taxiDays={2}
        taxiCost={120}
        taxiPendingCost={100}
        allPendingCost={240}
        totalCompTimeDays={4}
        periodLabel="本月"
        onPendingClick={() => undefined}
        onCompTimeClick={() => undefined}
      />,
    )

    expect(markup).not.toContain('已到账费用')
    expect(markup).not.toContain('本月可调休')
  })
})
