import { memo } from 'react'
import { CalendarRange, CarFront, Clock3, Moon, WalletCards } from 'lucide-react'
import { formatCurrency } from '../records'

type SummaryCardsProps = {
  days: number
  taxiDays: number
  taxiCost: number
  taxiPendingCost: number
  allPendingCost: number
  totalCompTimeDays: number
  periodLabel: string
  isLoading?: boolean
  onPendingClick: () => void
  onCompTimeClick: () => void
}

export const SummaryCards = memo(function SummaryCards({ days, taxiDays, taxiCost, taxiPendingCost, allPendingCost, totalCompTimeDays, periodLabel, isLoading = false, onPendingClick, onCompTimeClick }: SummaryCardsProps) {
  const showDays = (value: number) => isLoading ? '—' : `${value} 天`
  const showMoney = (value: number) => isLoading ? '—' : `¥${formatCurrency(value)}`

  const cards = [
    { label: `${periodLabel}加班天数`, value: showDays(days), icon: Moon, tone: 'blue' },
    { label: `${periodLabel}打车天数`, value: showDays(taxiDays), icon: CarFront, tone: 'orange' },
    { label: `${periodLabel}打车总费用`, value: showMoney(taxiCost), icon: WalletCards, tone: 'green' },
    { label: `${periodLabel}未到账费用`, value: showMoney(taxiPendingCost), icon: Clock3, tone: 'orange' },
    { label: '未到账总费用', value: showMoney(allPendingCost), icon: Clock3, tone: 'orange', hint: '含尚未申报的费用', action: { onClick: onPendingClick, ariaLabel: '查看未到账总费用明细' } },
    { label: '累计可调休', value: showDays(totalCompTimeDays), icon: CalendarRange, tone: 'blue', action: { onClick: onCompTimeClick, ariaLabel: '查看累计调休明细' } },
  ]

  return (
    <section className="summary-grid" aria-label="本月汇总">
      {cards.map(({ label, value, icon: Icon, tone, hint, action }) => {
        const content = <><div className="summary-card__icon"><Icon size={18} strokeWidth={2.2} /></div><div><p>{label}</p><strong>{value}</strong></div></>
        if (action) return <button className={`summary-card summary-card--${tone} summary-card--action`} key={label} type="button" onClick={action.onClick} aria-label={action.ariaLabel} title={hint}>{content}</button>
        return <article className={`summary-card summary-card--${tone}`} key={label} title={hint}>{content}</article>
      })}
    </section>
  )
})
