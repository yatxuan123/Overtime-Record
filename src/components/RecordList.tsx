import { memo, useEffect, useMemo, useState } from 'react'
import { CalendarCheck2, CarFront, ChevronLeft, ChevronRight, Edit3, Inbox, Trash2, X } from 'lucide-react'
import { filterRecords, filterRecordsByPeriod, formatCurrency, getCompTimeDays, getPendingReimbursements, getRejectedReimbursements, NORMAL_REIMBURSEMENT_WINDOW_DAYS, paginateRecords, REIMBURSEMENT_STATUS_OPTIONS, reimbursementStatusLabel, sumPendingReimbursementAmount, taxiProviderLabel } from '../records'
import { localDateKey } from '../overtime'
import type { OvertimeRecord, ReimbursementStatus } from '../types'
import { Modal } from './Modal'

type RecordListProps = { records: OvertimeRecord[]; period: string; periodLabel: string; embedded?: boolean; showHeading?: boolean; onEdit: (record: OvertimeRecord) => void; onDelete: (record: OvertimeRecord) => void }

const PAGE_SIZE = 8
const pad = (value: number) => String(value).padStart(2, '0')
const dateFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })

export const RecordList = memo(function RecordList({ records, period, periodLabel, embedded = false, showHeading = true, onEdit, onDelete }: RecordListProps) {
  const [page, setPage] = useState(1)
  const [isPendingDetailsOpen, setIsPendingDetailsOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ReimbursementStatus | 'all'>('all')
  const [keyword, setKeyword] = useState('')
  const today = localDateKey()

  const periodRecords = useMemo(() => filterRecordsByPeriod(records, period), [period, records])
  const filteredRecords = useMemo(() => filterRecords(periodRecords, { status: statusFilter, keyword }), [keyword, periodRecords, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleRecords = useMemo(() => paginateRecords(filteredRecords, currentPage, PAGE_SIZE), [currentPage, filteredRecords])
  const pendingReimbursements = useMemo(() => getPendingReimbursements(records, today), [records, today])
  const rejectedRecords = useMemo(() => getRejectedReimbursements(records), [records])
  const pendingAmount = useMemo(() => sumPendingReimbursementAmount(records, period), [period, records])
  const allPendingAmount = useMemo(() => sumPendingReimbursementAmount(records), [records])
  const overduePending = useMemo(() => pendingReimbursements.filter((item) => item.waitingDays > NORMAL_REIMBURSEMENT_WINDOW_DAYS), [pendingReimbursements])
  const previousMonthPending = useMemo(() => {
    const date = new Date(`${today.slice(0, 7)}-01T12:00:00`)
    date.setMonth(date.getMonth() - 1)
    const previousMonth = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
    return pendingReimbursements.filter(({ record }) => record.date.startsWith(previousMonth))
  }, [pendingReimbursements, today])

  useEffect(() => { setPage(1) }, [period, records.length, statusFilter, keyword])

  return <>
    <section className={`records-panel ${embedded ? 'records-panel--embedded' : ''}`}>
      {showHeading && <div className="panel-heading panel-heading--list">
        <div><span className="section-kicker">{periodLabel}</span><h2>加班明细</h2></div>
        <span className="record-count">{filteredRecords.length} 笔</span>
      </div>}

      {(pendingReimbursements.length > 0 || rejectedRecords.length > 0) && <aside className="reimbursement-reminder" role="status">
        <div className="reimbursement-reminder__icon"><CalendarCheck2 size={18} /></div>
        <div className="reimbursement-reminder__content">
          <strong>报销待办</strong>
          {pendingReimbursements.length > 0 && <p>有 {pendingReimbursements.length} 笔已申报但未到账，最早一笔是 {pendingReimbursements[0].record.date}，已等待 {pendingReimbursements[0].waitingDays} 天。</p>}
          {overduePending.length > 0 && <p className="reimbursement-reminder__alert">其中 {overduePending.length} 笔已等待超过 {NORMAL_REIMBURSEMENT_WINDOW_DAYS} 天，建议去催一下。</p>}
          {previousMonthPending.length > 0 && <p>上个月还有 {previousMonthPending.length} 笔未到账，最早已等待 {previousMonthPending[0].waitingDays} 天。</p>}
          {rejectedRecords.length > 0 && <p className="reimbursement-reminder__alert">有 {rejectedRecords.length} 笔被驳回，需要重新提交。</p>}
        </div>
        <div className="reimbursement-reminder__amounts">
          <div><span>{periodLabel}未到账</span><strong>¥{formatCurrency(pendingAmount)}</strong></div>
          <button className="reimbursement-total-button" type="button" onClick={() => setIsPendingDetailsOpen(true)} aria-label="查看未到账费用明细" title="查看未到账费用明细"><span>未到账总费用</span><strong>¥{formatCurrency(allPendingAmount)}</strong></button>
        </div>
      </aside>}

      <div className="record-filters">
        <label className="record-filters__field">
          <span>报销状态</span>
          <select className="select-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReimbursementStatus | 'all')} aria-label="按报销状态筛选">
            <option value="all">全部</option>
            {REIMBURSEMENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="record-filters__field record-filters__field--grow">
          <span>关键字</span>
          <div className="input-wrap"><input type="search" placeholder="搜索备注、打车方式或日期" value={keyword} onChange={(event) => setKeyword(event.target.value)} aria-label="搜索加班记录" /></div>
        </label>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Inbox size={22} /></div>
          <strong>{periodRecords.length === 0 ? `${periodLabel}还没有加班记录` : '没有符合条件的记录'}</strong>
          <p>{periodRecords.length === 0 ? '点上方「新增加班」记录第一笔。' : '换个报销状态或清空关键字再试。'}</p>
        </div>
      ) : (
        <>
          <div className="record-list">
            {visibleRecords.map((record) => (
              <article className="record-row" key={record.id}>
                <div className="record-date">
                  <strong>{new Date(`${record.date}T00:00:00`).getDate().toString().padStart(2, '0')}</strong>
                  <span>{dateFormatter.format(new Date(`${record.date}T00:00:00`)).replace(/^\d+月/, '')}</span>
                </div>
                <button className="record-main record-edit-trigger" type="button" onClick={() => onEdit(record)} aria-label={`编辑 ${record.date} 的加班记录`}>
                  <div className="record-title">
                    <strong>{record.note || '未填写备注'}</strong>
                    {getCompTimeDays(record) > 0 && <span className="record-badge record-badge--comp-time">周末加班 · 调休 {getCompTimeDays(record)} 天</span>}
                    <span className="record-badge">{record.tookTaxi ? taxiProviderLabel(record) : '自行回家'}</span>
                    {record.tookTaxi && <span className={`record-status record-status--${record.reimbursementStatus || 'unsubmitted'}`}>{reimbursementStatusLabel(record.reimbursementStatus)}</span>}
                  </div>
                  <div className="record-meta">
                    <span>加班日</span>
                    {record.tookTaxi && <span><CarFront size={14} />¥{formatCurrency(record.taxiCost)}</span>}
                    {record.tookTaxi && record.reimbursementStatus === 'paid' && record.reimbursementPaidAt && <span><CalendarCheck2 size={14} />到账 {record.reimbursementPaidAt}</span>}
                  </div>
                </button>
                <div className="row-actions">
                  <button className="icon-button" onClick={() => onEdit(record)} aria-label="编辑记录" title="编辑记录"><Edit3 size={16} /></button>
                  <button className="icon-button icon-button--danger" onClick={() => onDelete(record)} aria-label="删除记录" title="删除记录"><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
          {totalPages > 1 && <nav className="record-pagination" aria-label="加班明细分页">
            <button className="icon-button" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} aria-label="上一页" title="上一页"><ChevronLeft size={18} /></button>
            <span>第 {currentPage} / {totalPages} 页</span>
            <button className="icon-button" type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} aria-label="下一页" title="下一页"><ChevronRight size={18} /></button>
          </nav>}
        </>
      )}
    </section>

    {isPendingDetailsOpen && <Modal onClose={() => setIsPendingDetailsOpen(false)} backdropClassName="pending-detail-backdrop" panelClassName="pending-detail-modal" labelledBy="pending-detail-title">
      <header className="pending-detail-modal__header">
        <div><span className="section-kicker">REIMBURSEMENT</span><h2 id="pending-detail-title">未到账费用明细</h2></div>
        <button className="icon-button" type="button" onClick={() => setIsPendingDetailsOpen(false)} aria-label="关闭未到账费用明细" title="关闭"><X size={18} /></button>
      </header>
      <div className="pending-detail-modal__summary">
        <span>共 {pendingReimbursements.length} 笔等待打款 · 未到账总额含未申报</span>
        <strong>¥{formatCurrency(allPendingAmount)}</strong>
      </div>
      <div className="pending-detail-list">
        {pendingReimbursements.map(({ record, waitingDays }) => <button
          className="pending-detail-row"
          type="button"
          key={record.id}
          onClick={() => { setIsPendingDetailsOpen(false); onEdit(record) }}
          aria-label={`编辑 ${record.date} 未到账费用`}
        >
          <span className="pending-detail-date">
            <strong>{record.date}</strong>
            <small className={waitingDays > NORMAL_REIMBURSEMENT_WINDOW_DAYS ? 'is-overdue' : ''}>已等待 {waitingDays} 天{waitingDays > NORMAL_REIMBURSEMENT_WINDOW_DAYS ? ' · 已超期' : ''}</small>
          </span>
          <span className="pending-detail-provider">{taxiProviderLabel(record)}</span>
          <span className="pending-detail-status">{reimbursementStatusLabel(record.reimbursementStatus)}</span>
          <strong className="pending-detail-amount">¥{formatCurrency(record.taxiCost)}</strong>
        </button>)}
      </div>
    </Modal>}
  </>
})
