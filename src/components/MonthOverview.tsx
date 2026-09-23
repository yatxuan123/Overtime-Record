import { memo, useMemo, useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency, getCompTimeDays, reimbursementStatusLabel, sumCompTimeDays } from '../records'
import { localDateKey } from '../overtime'
import type { OvertimeRecord } from '../types'

type MonthOverviewProps = { records: OvertimeRecord[]; selectedMonth: string; mode: 'month' | 'year'; onMonthChange: (month: string) => void; onModeChange: (mode: 'month' | 'year') => void; onDateSelect: (date: string, record?: OvertimeRecord) => void }
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const pad = (value: number) => String(value).padStart(2, '0')

export const MonthOverview = memo(function MonthOverview({ records, selectedMonth, mode, onMonthChange, onModeChange, onDateSelect }: MonthOverviewProps) {
  const [displayMode, setDisplayMode] = useState<'indicators' | 'text'>('indicators')
  const now = selectedMonth ? new Date(`${selectedMonth}-01T12:00:00`) : new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthKey = `${year}-${pad(month + 1)}`
  const yearKey = String(year)
  const todayKey = localDateKey()
  const periodKey = mode === 'year' ? yearKey : monthKey

  const monthView = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate()
    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7
    const recordMap = new Map(records.filter((record) => record.date.startsWith(monthKey)).map((record) => [record.date, record]))
    const cells = Array.from({ length: Math.ceil((firstOffset + days) / 7) * 7 }, (_, index) => index - firstOffset + 1)
    const taxiTotal = [...recordMap.values()].filter((record) => record.tookTaxi).reduce((sum, record) => sum + record.taxiCost, 0)
    return { days, firstOffset, recordMap, cells, taxiTotal }
  }, [month, monthKey, records, year])

  // 单遍聚合 12 个月，替代原先每个月各做一次 filter + reduce。
  const yearView = useMemo(() => {
    const monthly = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, days: 0, taxiCost: 0 }))
    for (const record of records) {
      if (!record.date.startsWith(`${yearKey}-`)) continue
      const monthIndex = Number(record.date.slice(5, 7))
      if (!Number.isInteger(monthIndex) || monthIndex < 1 || monthIndex > 12) continue
      const bucket = monthly[monthIndex - 1]
      bucket.days += 1
      if (record.tookTaxi) bucket.taxiCost += record.taxiCost
    }
    const taxiTotal = monthly.reduce((sum, item) => sum + item.taxiCost, 0)
    return { monthly, taxiTotal }
  }, [records, yearKey])

  const compTimeTotal = sumCompTimeDays(records, periodKey)
  const shiftPeriod = (offset: number) => { const next = new Date(year + (mode === 'year' ? offset : 0), month + (mode === 'year' ? 0 : offset), 1); onMonthChange(`${next.getFullYear()}-${pad(next.getMonth() + 1)}`) }

  if (mode === 'year') return <section className="month-overview">
    <div className="overview-heading">
      <div><span className="section-kicker">日历总览</span><h2>{year}年，哪几天加了班</h2></div>
      <div className="month-navigator">
        <button type="button" onClick={() => shiftPeriod(-1)} aria-label="上一年"><ChevronLeft size={18} /></button>
        <label>
          <CalendarRange size={15} /><span>{year}年</span>
          <input type="number" min="2000" max="2100" value={year} onChange={(event) => onMonthChange(`${event.target.value}-${pad(month + 1)}`)} aria-label="选择统计年份" />
        </label>
        <button type="button" onClick={() => shiftPeriod(1)} aria-label="下一年"><ChevronRight size={18} /></button>
        <button type="button" className="overview-mode-toggle" onClick={() => onModeChange('month')}>按月</button>
      </div>
    </div>
    <div className="year-overview-grid">
      {yearView.monthly.map((item) => {
        const isCurrentMonth = `${yearKey}-${pad(item.month)}` === todayKey.slice(0, 7)
        return <button
          type="button"
          className={`year-overview-month ${item.days ? 'has-record' : ''} ${isCurrentMonth ? 'is-current' : ''}`}
          key={item.month}
          onClick={() => { onModeChange('month'); onMonthChange(`${yearKey}-${pad(item.month)}`) }}
        >
          <strong>{item.month}月</strong>
          <span>{item.days} 天加班</span>
          <small>{item.taxiCost ? `打车 ¥${formatCurrency(item.taxiCost)}` : '无打车'}</small>
        </button>
      })}
    </div>
    <div className="overview-legend">
      <span><i className="legend-dot legend-dot--overtime" />加班日</span>
      <span className="overview-total">全年打车费用 ¥{formatCurrency(yearView.taxiTotal)} · 可调休 {compTimeTotal} 天</span>
    </div>
  </section>

  return <section className={`month-overview month-overview--${displayMode}`}>
    <div className="overview-heading">
      <div><span className="section-kicker">日历总览</span><h2>这个月，哪几天加了班</h2></div>
      <div className="month-navigator">
        <button type="button" onClick={() => shiftPeriod(-1)} aria-label="上个月"><ChevronLeft size={18} /></button>
        <label>
          <CalendarRange size={15} /><span>{year}年{month + 1}月</span>
          <input type="month" value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)} aria-label="选择统计月份" />
        </label>
        <button type="button" onClick={() => shiftPeriod(1)} aria-label="下个月"><ChevronRight size={18} /></button>
        <button type="button" className="overview-mode-toggle" onClick={() => onModeChange('year')}>按年</button>
        <div className="calendar-display-toggle" aria-label="日历显示方式">
          <button type="button" className={displayMode === 'indicators' ? 'is-active' : ''} aria-pressed={displayMode === 'indicators'} onClick={() => setDisplayMode('indicators')}>状态</button>
          <button type="button" className={displayMode === 'text' ? 'is-active' : ''} aria-pressed={displayMode === 'text'} onClick={() => setDisplayMode('text')}>文字</button>
        </div>
      </div>
    </div>
    <div className="calendar-grid calendar-grid--overview calendar-grid--head">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid calendar-grid--overview">
      {monthView.cells.map((day, index) => {
        if (day < 1 || day > monthView.days) return <span className="overview-empty" key={`empty-${index}`} />
        const date = `${year}-${pad(month + 1)}-${pad(day)}`
        const record = monthView.recordMap.get(date)
        const reimbursementStatus = record?.reimbursementStatus || 'unsubmitted'
        const compDays = record ? getCompTimeDays(record) : 0
        const isFuture = date > todayKey
        const ariaLabel = isFuture ? `${date} 暂不允许记录未来日期` : record ? `编辑 ${date} 的加班记录${record.tookTaxi ? `，打车，${reimbursementStatusLabel(reimbursementStatus)}` : ''}` : `新增 ${date} 的加班记录`
        return <button
          type="button"
          className={`overview-day ${record ? 'has-record' : ''} ${date === todayKey ? 'is-today' : ''} ${isFuture ? 'is-disabled' : ''}`}
          key={date}
          disabled={isFuture}
          onClick={() => onDateSelect(date, record)}
          aria-label={ariaLabel}
        >
          <strong>{day}</strong>
          {record && (displayMode === 'indicators' ? <div className="overview-day__indicators">
            <i className="calendar-indicator calendar-indicator--overtime" role="img" aria-label="加班" title="加班" />
            {compDays > 0 && <i className="calendar-indicator calendar-indicator--comp-time" role="img" aria-label={`调休 ${compDays} 天`} title={`调休 ${compDays} 天`} />}
            {record.tookTaxi && <i className={`calendar-indicator calendar-indicator--taxi calendar-indicator--${reimbursementStatus}`} role="img" aria-label={`打车，${reimbursementStatusLabel(reimbursementStatus)}`} title={`打车，${reimbursementStatusLabel(reimbursementStatus)}`} />}
          </div> : <div className="overview-day__text">
            <span>加班</span>
            {compDays > 0 && <span>调休 {compDays} 天</span>}
            {record.tookTaxi && <span>打车 · {reimbursementStatusLabel(reimbursementStatus)}</span>}
            {record.tookTaxi && <span>¥{formatCurrency(record.taxiCost)}</span>}
          </div>)}
        </button>
      })}
    </div>
    <div className="overview-legend">
      <span><i className="legend-dot legend-dot--overtime" />加班</span>
      <span><i className="legend-dot legend-dot--comp-time" />调休</span>
      <span><i className="legend-dot legend-dot--unsubmitted" />打车未申报</span>
      <span><i className="legend-dot legend-dot--submitted" />打车已申报</span>
      <span><i className="legend-dot legend-dot--paid" />打车已到账</span>
      <span className="overview-total">本月打车费用 ¥{formatCurrency(monthView.taxiTotal)} · 可调休 {compTimeTotal} 天</span>
    </div>
  </section>
})
