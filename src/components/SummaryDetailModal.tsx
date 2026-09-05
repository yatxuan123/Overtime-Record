import { memo, useMemo } from 'react'
import { CalendarClock, CalendarRange, CarFront, Clock3, X } from 'lucide-react'
import { formatCurrency, getCompTimeDays, getPendingReimbursements, reimbursementStatusLabel, sumPendingReimbursementAmount, taxiProviderLabel } from '../records'
import { localDateKey } from '../overtime'
import type { OvertimeRecord } from '../types'

type SummaryDetailModalProps = {
  mode: 'pending' | 'comp-time'
  records: OvertimeRecord[]
  onClose: () => void
  onEdit: (record: OvertimeRecord) => void
}

export const SummaryDetailModal = memo(function SummaryDetailModal({ mode, records, onClose, onEdit }: SummaryDetailModalProps) {
  const pendingReimbursements = useMemo(() => getPendingReimbursements(records, localDateKey()), [records])
  const pendingAmount = useMemo(() => sumPendingReimbursementAmount(records), [records])
  const compTimeRecords = useMemo(() => records.filter((record) => getCompTimeDays(record) > 0).sort((left, right) => right.date.localeCompare(left.date)), [records])
  const isPending = mode === 'pending'
  const title = isPending ? '未到账费用明细' : '调休明细'
  const countLabel = isPending ? `共 ${pendingReimbursements.length} 笔未到账` : `共 ${compTimeRecords.length} 天调休`

  return <div className="pending-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`pending-detail-modal summary-detail-modal summary-detail-modal--${mode}`} role="dialog" aria-modal="true" aria-labelledby="summary-detail-title">
      <header className="pending-detail-modal__header"><div><span className="section-kicker">{isPending ? 'REIMBURSEMENT' : 'COMPENSATORY TIME'}</span><h2 id="summary-detail-title">{title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label={`关闭${title}`} title="关闭"><X size={18} /></button></header>
      <div className="pending-detail-modal__summary"><span>{countLabel}</span><strong>{isPending ? `¥${formatCurrency(pendingAmount)}` : `${compTimeRecords.length} 天`}</strong></div>
      <div className="pending-detail-list">
        {isPending ? pendingReimbursements.map(({ record, waitingDays }) => <button className="pending-detail-row" type="button" key={record.id} onClick={() => { onClose(); onEdit(record) }} aria-label={`编辑 ${record.date} 未到账费用`}><span className="pending-detail-date"><strong>{record.date}</strong><small>已等待 {waitingDays} 天</small></span><span className="pending-detail-provider"><CarFront size={14} />{taxiProviderLabel(record)}</span><span className="pending-detail-status">{reimbursementStatusLabel(record.reimbursementStatus)}</span><strong className="pending-detail-amount">¥{formatCurrency(record.taxiCost)}</strong></button>) : compTimeRecords.map((record) => <button className="pending-detail-row comp-time-detail-row" type="button" key={record.id} onClick={() => { onClose(); onEdit(record) }} aria-label={`编辑 ${record.date} 调休记录`}><span className="pending-detail-date"><strong>{record.date}</strong><small>周末加班</small></span><span className="pending-detail-provider"><CalendarClock size={14} />调休 1 天</span><span className="pending-detail-status">可调休</span><strong className="pending-detail-amount"><CalendarRange size={14} />1 天</strong></button>)}
        {((isPending && pendingReimbursements.length === 0) || (!isPending && compTimeRecords.length === 0)) && <div className="summary-detail-empty">暂无{isPending ? '未到账费用' : '调休记录'}</div>}
      </div>
    </section>
  </div>
})
