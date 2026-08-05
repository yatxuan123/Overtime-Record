import { CarFront, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import type { OvertimeRecord } from '../types'

type MonthOverviewProps = { records: OvertimeRecord[]; selectedMonth: string; onMonthChange: (month: string) => void }
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const pad = (value: number) => String(value).padStart(2, '0')

export function MonthOverview({ records, selectedMonth, onMonthChange }: MonthOverviewProps) {
  const now = selectedMonth ? new Date(`${selectedMonth}-01T12:00:00`) : new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthKey = `${year}-${pad(month + 1)}`
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const recordMap = new Map(records.filter((record) => record.date.startsWith(monthKey)).map((record) => [record.date, record]))
  const cells = Array.from({ length: Math.ceil((firstOffset + days) / 7) * 7 }, (_, index) => index - firstOffset + 1)
  const shiftMonth = (offset: number) => { const next = new Date(year, month + offset, 1); onMonthChange(`${next.getFullYear()}-${pad(next.getMonth() + 1)}`) }
  return <section className="month-overview"><div className="overview-heading"><div><span className="section-kicker">日历总览</span><h2>这个月，哪几天加了班</h2></div><div className="month-navigator"><button type="button" onClick={() => shiftMonth(-1)} aria-label="上个月"><ChevronLeft size={18} /></button><label><CalendarRange size={15} /><span>{year}年{month + 1}月</span><input type="month" value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)} aria-label="选择统计月份" /></label><button type="button" onClick={() => shiftMonth(1)} aria-label="下个月"><ChevronRight size={18} /></button></div></div><div className="calendar-grid calendar-grid--overview calendar-grid--head">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid calendar-grid--overview">{cells.map((day, index) => { if (day < 1 || day > days) return <span className="overview-empty" key={`empty-${index}`} />; const date = `${year}-${pad(month + 1)}-${pad(day)}`; const record = recordMap.get(date); return <div className={`overview-day ${record ? 'has-record' : ''}`} key={date}><strong>{day}</strong>{record && <div className="overview-day__meta"><span>{record.hours.toFixed(1)}h</span>{record.tookTaxi && <span className="overview-day__taxi"><CarFront size={11} />¥{record.taxiCost.toFixed(0)}</span>}</div>}</div> })}</div><div className="overview-legend"><span><i className="legend-dot legend-dot--overtime" />加班日</span><span><i className="legend-dot legend-dot--taxi" />含打车费用</span><span className="overview-total">本月打车报销 ¥{records.filter((record) => record.date.startsWith(monthKey) && record.tookTaxi).reduce((sum, record) => sum + record.taxiCost, 0).toFixed(0)}</span></div></section>
}
