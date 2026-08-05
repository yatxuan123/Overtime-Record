import { memo } from 'react'
import { CarFront, Clock3, Moon } from 'lucide-react'

type SummaryCardsProps = {
  days: number
  hours: number
  taxiCost: number
}

export const SummaryCards = memo(function SummaryCards({ days, hours, taxiCost }: SummaryCardsProps) {
  const cards = [
    { label: '本月加班天数', value: `${days} 天`, icon: Moon, tone: 'blue' },
    { label: '累计加班时长', value: `${hours.toFixed(1)} 小时`, icon: Clock3, tone: 'orange' },
    { label: '打车总费用', value: `¥${taxiCost.toFixed(0)}`, icon: CarFront, tone: 'green' },
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
