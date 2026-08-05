import { BarChart3 } from 'lucide-react'
import { buildPeriodStats, type PeriodMode } from '../overtime'
import type { OvertimeRecord } from '../types'

type StatsChartProps = { records: OvertimeRecord[]; mode: PeriodMode; referenceDate: Date; onModeChange: (mode: PeriodMode) => void }

export function StatsChart({ records, mode, referenceDate, onModeChange }: StatsChartProps) {
  const stats = buildPeriodStats(records, mode, referenceDate)
  const maxHours = Math.max(...stats.map((item) => item.hours), 1)
  const totalHours = stats.reduce((sum, item) => sum + item.hours, 0)
  const totalTaxi = stats.reduce((sum, item) => sum + item.taxiCost, 0)
  const periodName = mode === 'week' ? '本周' : mode === 'month' ? `${referenceDate.getMonth() + 1}月` : `${referenceDate.getFullYear()}年`
  return <section className="stats-panel">
    <div className="stats-heading"><div><span className="section-kicker">趋势统计</span><h2>时间与费用</h2></div><div className="period-switcher" role="tablist" aria-label="统计周期"><button className={mode === 'week' ? 'is-active' : ''} onClick={() => onModeChange('week')} role="tab" aria-selected={mode === 'week'}>本周</button><button className={mode === 'month' ? 'is-active' : ''} onClick={() => onModeChange('month')} role="tab" aria-selected={mode === 'month'}>按月</button><button className={mode === 'year' ? 'is-active' : ''} onClick={() => onModeChange('year')} role="tab" aria-selected={mode === 'year'}>按年</button></div></div>
    <div className="stats-totals"><div><span>加班时长</span><strong>{totalHours.toFixed(1)}<small> 小时</small></strong></div><div><span>打车费用</span><strong>¥{totalTaxi.toFixed(0)}</strong></div><div className="chart-legend"><i /> 加班时长</div></div>
    <div className={`bar-chart bar-chart--${mode}`} aria-label={`${periodName}加班时长柱状图`}>{stats.map((item) => <div className="bar-column" key={item.date}><div className="bar-track"><div className="bar-fill" style={{ height: `${item.hours ? Math.max(8, (item.hours / maxHours) * 100) : 0}%` }} title={`${item.date}：${item.hours.toFixed(1)} 小时，打车 ¥${item.taxiCost.toFixed(0)}`} /></div><span>{item.label}</span></div>)}</div>
    <div className="chart-footnote"><BarChart3 size={14} />柱状图按每天加班时长汇总，悬停可查看打车费用</div>
  </section>
}
