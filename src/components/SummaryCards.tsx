import { memo } from 'react'
import { CarFront, CircleCheck, Clock3, Moon, WalletCards } from 'lucide-react'

type SummaryCardsProps = {
  days: number
  taxiDays: number
  taxiCost: number
  taxiPaidCost: number
  taxiPendingCost: number
  periodLabel: string
}

export const SummaryCards = memo(function SummaryCards({ days, taxiDays, taxiCost, taxiPaidCost, taxiPendingCost, periodLabel }: SummaryCardsProps) {
  const cards = [
    { label: `${periodLabel}加班天数`, value: `${days} 天`, icon: Moon, tone: 'blue' },
    { label: `${periodLabel}打车天数`, value: `${taxiDays} 天`, icon: CarFront, tone: 'orange' },
    { label: `${periodLabel}打车总费用`, value: `¥${taxiCost.toFixed(0)}`, icon: WalletCards, tone: 'green' },
    { label: `${periodLabel}已到账费用`, value: `¥${taxiPaidCost.toFixed(0)}`, icon: CircleCheck, tone: 'green' },
    { label: `${periodLabel}未到账费用`, value: `¥${taxiPendingCost.toFixed(0)}`, icon: Clock3, tone: 'orange' },
  ] as const

  return (
    <section className="summary-grid" aria-label="本月汇总">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <article className={`summary-card summary-card--${tone}`} key={label}>
          <div className="summary-card__icon"><Icon size={18} strokeWidth={2.2} /></div>
          <div>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        </article>
      ))}
    </section>
  )
})
