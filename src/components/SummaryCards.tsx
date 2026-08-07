import { memo } from 'react'
import { CarFront, Moon, WalletCards } from 'lucide-react'

type SummaryCardsProps = {
  days: number
  taxiDays: number
  taxiCost: number
  periodLabel: string
}

export const SummaryCards = memo(function SummaryCards({ days, taxiDays, taxiCost, periodLabel }: SummaryCardsProps) {
  const cards = [
    { label: `${periodLabel}加班天数`, value: `${days} 天`, icon: Moon, tone: 'blue' },
    { label: `${periodLabel}打车天数`, value: `${taxiDays} 天`, icon: CarFront, tone: 'orange' },
    { label: `${periodLabel}打车费用`, value: `¥${taxiCost.toFixed(0)}`, icon: WalletCards, tone: 'green' },
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
