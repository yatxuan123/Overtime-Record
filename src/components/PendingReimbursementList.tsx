import { memo, useMemo, useState } from 'react'
import { CarFront } from 'lucide-react'
import { formatCurrency, NORMAL_REIMBURSEMENT_WINDOW_DAYS, reimbursementStatusLabel, sortUnpaidReimbursements, taxiProviderLabel, type UnpaidReimbursement, type UnpaidSort } from '../records'
import type { OvertimeRecord } from '../types'

type PendingReimbursementListProps = {
  entries: UnpaidReimbursement[]
  onSelect: (record: OvertimeRecord) => void
  emptyText?: string
}

const isOverdue = (entry: UnpaidReimbursement) => entry.status === 'submitted' && entry.waitingDays !== null && entry.waitingDays > NORMAL_REIMBURSEMENT_WINDOW_DAYS

// 副标题必须按状态分支：「已等待 N 天」只对「已申报」成立 —— 未申报从没提交过，
// 被驳回则是在等我们重新提交，两者都没有打款等待期可言。
function statusHint(entry: UnpaidReimbursement): string {
  if (entry.status === 'rejected') return '需重新提交'
  if (entry.status !== 'submitted' || entry.waitingDays === null) return '尚未申报'
  return `已等待 ${entry.waitingDays} 天${entry.waitingDays > NORMAL_REIMBURSEMENT_WINDOW_DAYS ? ' · 已超期' : ''}`
}

const SORT_OPTIONS: ReadonlyArray<{ value: UnpaidSort; label: string }> = [
  { value: 'urgency', label: '默认' },
  { value: 'amount-desc', label: '金额↓' },
  { value: 'amount-asc', label: '金额↑' },
  { value: 'status', label: '按状态' },
]

// 「未到账费用明细」的列表。顶部汇总卡片与加班明细里的「报销待办」面板各有一个入口，
// 共用这一份，避免同一段 markup 每次都要改两遍。排序状态也放在这里，两个入口自动都有。
export const PendingReimbursementList = memo(function PendingReimbursementList({ entries, onSelect, emptyText = '暂无未到账费用' }: PendingReimbursementListProps) {
  const [sortBy, setSortBy] = useState<UnpaidSort>('urgency')
  const sortedEntries = useMemo(() => sortUnpaidReimbursements(entries, sortBy), [entries, sortBy])

  return <>
    {entries.length > 0 && <div className="pending-detail-sort">
      <span>排序</span>
      <div className="pending-detail-sort__toggle" role="group" aria-label="未到账费用排序方式">
        {SORT_OPTIONS.map((option) => <button
          type="button"
          key={option.value}
          className={sortBy === option.value ? 'is-active' : ''}
          aria-pressed={sortBy === option.value}
          onClick={() => setSortBy(option.value)}
        >{option.label}</button>)}
      </div>
    </div>}
    <div className="pending-detail-list">
      {sortedEntries.map((entry) => <button
        className="pending-detail-row"
        type="button"
        key={entry.record.id}
        onClick={() => onSelect(entry.record)}
        aria-label={`编辑 ${entry.record.date} 未到账费用`}
      >
        <span className="pending-detail-date">
          <strong>{entry.record.date}</strong>
          <small className={isOverdue(entry) ? 'is-overdue' : ''}>{statusHint(entry)}</small>
        </span>
        <span className="pending-detail-provider"><CarFront size={14} />{taxiProviderLabel(entry.record)}</span>
        {/* 只借用 .record-status--* 的颜色，徽章底框由 styles.css 里的复合规则压掉。 */}
        <span className={`pending-detail-status record-status record-status--${entry.status}`}>{reimbursementStatusLabel(entry.record.reimbursementStatus)}</span>
        <strong className="pending-detail-amount">¥{formatCurrency(entry.record.taxiCost)}</strong>
      </button>)}
      {sortedEntries.length === 0 && <div className="summary-detail-empty">{emptyText}</div>}
    </div>
  </>
})
