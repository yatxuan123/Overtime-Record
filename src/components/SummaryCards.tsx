import { memo } from 'react'
import { CalendarClock, CalendarRange, CarFront, CircleCheck, Clock3, Moon, WalletCards } from 'lucide-react'
import { formatCurrency } from '../records'

type SummaryCardsProps = {
  days: number
  taxiDays: number
  taxiCost: number
  taxiPaidCost: number
  taxiPendingCost: number
  allPendingCost: number
  compTimeDays: number
  totalCompTimeDays: number
  periodLabel: string
  onPendingClick: () => void
  onCompTimeClick: () => void
}

export const SummaryCards = memo(function SummaryCards({ days, taxiDays, taxiCost, taxiPaidCost, taxiPendingCost, allPendingCost, compTimeDays, totalCompTimeDays, periodLabel, onPendingClick, onCompTimeClick }: SummaryCardsProps) {
  const cards = [
    { label: `${periodLabel}加班天数`, value: `${days} 天`, icon: Moon, tone: 'blue' },
    { label: `${periodLabel}打车天数`, value: `${taxiDays} 天`, icon: CarFront, tone: 'orange' },
    { label: `${periodLabel}打车总费用`, value: `¥${formatCurrency(taxiCost)}`, icon: WalletCards, tone: 'green' },
    { label: `${periodLabel}已到账费用`, value: `¥${formatCurrency(taxiPaidCost)}`, icon: CircleCheck, tone: 'green' },
    { label: `${periodLabel}未到账费用`, value: `¥${formatCurrency(taxiPendingCost)}`, icon: Clock3, tone: 'orange' },
    { label: '未到账总费用', value: `¥${formatCurrency(allPendingCost)}`, icon: Clock3, tone: 'orange', action: { onClick: onPendingClick, ariaLabel: '查看未到账总费用明细' } },
    { label: `${periodLabel}可调休`, value: `${compTimeDays} 天`, icon: CalendarClock, tone: 'blue' },
    { label: '累计可调休', value: `${totalCompTimeDays} 天`, icon: CalendarRange, tone: 'blue', action: { onClick: onCompTimeClick, ariaLabel: '查看累计调休明细' } },
  ]

  return (
    <section className="summary-grid" aria-label="本月汇总">
      {cards.map(({ label, value, icon: Icon, tone, action }) => {
        const content = <><div className="summary-card__icon"><Icon size={18} strokeWidth={2.2} /></div><div><p>{label}</p><strong>{value}</strong></div></>
        if (action) return <button className={`summary-card summary-card--${tone} summary-card--action`} key={label} type="button" onClick={action.onClick} aria-label={action.ariaLabel}>{content}</button>
        return <article className={`summary-card summary-card--${tone}`} key={label}>{content}</article>
      })}
    </section>
  )
})
