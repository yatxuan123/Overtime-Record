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

// 07-08 周三、07-11 周六、08-08 周六、09-03 周四：覆盖「有加班但调休为 0」的月份。
const yearRecords: OvertimeRecord[] = [
  { id: 'jul-weekday', date: '2026-07-08', tookTaxi: false, taxiCost: 0, taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted', note: '' },
  { id: 'jul-sat', date: '2026-07-11', tookTaxi: true, taxiCost: 30, taxiProvider: 'didi', taxiProviderOther: '', reimbursementStatus: 'paid', reimbursementPaidAt: '2026-07-20', note: '' },
  { id: 'aug-sat', date: '2026-08-08', tookTaxi: true, taxiCost: 50, taxiProvider: 'taxi', taxiProviderOther: '', reimbursementStatus: 'submitted', note: '' },
  { id: 'sep-weekday', date: '2026-09-03', tookTaxi: false, taxiCost: 0, taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted', note: '' },
]

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
    expect(markup).toContain('calendar-indicator--taxi calendar-indicator--paid')
    expect(markup).toContain('aria-label="打车，已到账"')
    expect(markup).not.toContain('calendar-indicator--taxi" role')
    expect(markup).not.toContain('overview-day__meta')
    expect(markup).toContain('aria-label="日历显示方式"')
    expect(markup).toContain('>状态</button>')
    expect(markup).toContain('>文字</button>')
  })

  it('shows comp time, taxi cost and pending cost for every month in year mode', () => {
    const markup = renderToStaticMarkup(
      <MonthOverview
        records={yearRecords}
        selectedMonth="2026-08"
        mode="year"
        onMonthChange={() => undefined}
        onModeChange={() => undefined}
        onDateSelect={() => undefined}
      />,
    )

    // 7月：周三那笔不计调休、周六那笔计 1 天，所以是「2 天加班 · 调休 1 天」。
    expect(markup).toContain('2 天加班 · 调休 1 天')
    expect(markup).toContain('打车 ¥30')
    // 8月：周六 1 天调休，已申报的 50 元计入未到账。
    expect(markup).toContain('打车 ¥50')
    expect(markup).toContain('未到账 ¥50')
    // 9月只有工作日加班，调休为 0，那一截不渲染。
    expect(markup).not.toContain('调休 0 天')
    // 合计行与报销时效（唯一一笔已到账：07-11 → 07-20 共 9 天）。
    expect(markup).toContain('全年打车费用 ¥80 · 全年加班 4 天 · 可调休 2 天 · 未到账 ¥50')
    expect(markup).toContain('报销时效：平均 9 天 · 最长 9 天')
  })
})
