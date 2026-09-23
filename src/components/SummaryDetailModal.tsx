import { memo, useMemo } from 'react'
import { CalendarClock, CalendarRange, CarFront, X } from 'lucide-react'
import { COMP_TIME_EXPIRING_SOON_DAYS, COMP_TIME_VALIDITY_MONTHS, formatCurrency, getPendingReimbursements, isWithinDays, listCompTimeEntries, NORMAL_REIMBURSEMENT_WINDOW_DAYS, reimbursementStatusLabel, sumPendingReimbursementAmount, taxiProviderLabel } from '../records'
import { localDateKey } from '../overtime'
import type { OvertimeRecord } from '../types'
import { Modal } from './Modal'

type SummaryDetailModalProps = {
  mode: 'pending' | 'comp-time'
  records: OvertimeRecord[]
  onClose: () => void
  onEdit: (record: OvertimeRecord) => void
}

export const SummaryDetailModal = memo(function SummaryDetailModal({ mode, records, onClose, onEdit }: SummaryDetailModalProps) {
  const today = localDateKey()
  const pendingReimbursements = useMemo(() => getPendingReimbursements(records, today), [records, today])
  const pendingAmount = useMemo(() => sumPendingReimbursementAmount(records), [records])
  const compTimeEntries = useMemo(() => listCompTimeEntries(records, today), [records, today])
  const isPending = mode === 'pending'
  const title = isPending ? '未到账费用明细' : '调休明细'
  const totalCompDays = compTimeEntries.reduce((sum, entry) => sum + entry.days, 0)
  const countLabel = isPending
    ? `共 ${pendingReimbursements.length} 笔未到账 · 总额含未申报`
    : `共 ${totalCompDays} 天调休 · 按 ${COMP_TIME_VALIDITY_MONTHS} 个月有效期估算`

  return <Modal onClose={onClose} backdropClassName="pending-detail-backdrop" panelClassName={`pending-detail-modal summary-detail-modal summary-detail-modal--${mode}`} labelledBy="summary-detail-title">
    <header className="pending-detail-modal__header">
      <div><span className="section-kicker">{isPending ? 'REIMBURSEMENT' : 'COMPENSATORY TIME'}</span><h2 id="summary-detail-title">{title}</h2></div>
      <button className="icon-button" type="button" onClick={onClose} aria-label={`关闭${title}`} title="关闭"><X size={18} /></button>
    </header>
    <div className="pending-detail-modal__summary">
      <span>{countLabel}</span>
      <strong>{isPending ? `¥${formatCurrency(pendingAmount)}` : `${totalCompDays} 天`}</strong>
    </div>
    <div className="pending-detail-list">
      {isPending
        ? pendingReimbursements.map(({ record, waitingDays }) => <button
            className="pending-detail-row"
            type="button"
            key={record.id}
            onClick={() => { onClose(); onEdit(record) }}
            aria-label={`编辑 ${record.date} 未到账费用`}
          >
            <span className="pending-detail-date">
              <strong>{record.date}</strong>
              <small className={waitingDays > NORMAL_REIMBURSEMENT_WINDOW_DAYS ? 'is-overdue' : ''}>已等待 {waitingDays} 天{waitingDays > NORMAL_REIMBURSEMENT_WINDOW_DAYS ? ' · 已超期' : ''}</small>
            </span>
            <span className="pending-detail-provider"><CarFront size={14} />{taxiProviderLabel(record)}</span>
            <span className="pending-detail-status">{reimbursementStatusLabel(record.reimbursementStatus)}</span>
            <strong className="pending-detail-amount">¥{formatCurrency(record.taxiCost)}</strong>
          </button>)
        : compTimeEntries.map((entry) => <button
            className="pending-detail-row comp-time-detail-row"
            type="button"
            key={entry.record.id}
            onClick={() => { onClose(); onEdit(entry.record) }}
            aria-label={`编辑 ${entry.record.date} 调休记录`}
          >
            <span className="pending-detail-date">
              <strong>{entry.record.date}</strong>
              <small className={entry.isExpired ? 'is-overdue' : ''}>{entry.isExpired ? `已于 ${entry.expiresAt} 过期` : `有效至 ${entry.expiresAt}`}</small>
            </span>
            <span className="pending-detail-provider"><CalendarClock size={14} />调休 {entry.days} 天</span>
            <span className="pending-detail-status">{entry.isExpired ? '已过期' : isWithinDays(entry.expiresAt, today, COMP_TIME_EXPIRING_SOON_DAYS) ? '即将过期' : '可调休'}</span>
            <strong className="pending-detail-amount"><CalendarRange size={14} />{entry.days} 天</strong>
          </button>)}
      {((isPending && pendingReimbursements.length === 0) || (!isPending && compTimeEntries.length === 0)) && <div className="summary-detail-empty">暂无{isPending ? '未到账费用' : '调休记录'}</div>}
    </div>
  </Modal>
})
