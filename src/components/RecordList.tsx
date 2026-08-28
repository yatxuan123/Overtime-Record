import { memo, useEffect, useMemo, useState } from 'react'
import { CalendarCheck2, CarFront, ChevronLeft, ChevronRight, Edit3, Inbox, Trash2 } from 'lucide-react'
import { filterRecordsByPeriod, formatCurrency, getPendingReimbursements, paginateRecords, reimbursementStatusLabel, sumPendingReimbursementAmount, taxiProviderLabel } from '../records'
import { localDateKey } from '../overtime'
import type { OvertimeRecord } from '../types'

type RecordListProps = { records: OvertimeRecord[]; period: string; periodLabel: string; embedded?: boolean; showHeading?: boolean; onEdit: (record: OvertimeRecord) => void; onDelete: (id: string) => void }

const PAGE_SIZE = 8
const dateFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })

export const RecordList = memo(function RecordList({ records, period, periodLabel, embedded = false, showHeading = true, onEdit, onDelete }: RecordListProps) {
  const [page, setPage] = useState(1)
  const filteredRecords = useMemo(() => filterRecordsByPeriod(records, period), [period, records])
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleRecords = useMemo(() => paginateRecords(filteredRecords, currentPage, PAGE_SIZE), [currentPage, filteredRecords])
  const pendingReimbursements = useMemo(() => getPendingReimbursements(records, localDateKey()), [records])
  const pendingAmount = useMemo(() => sumPendingReimbursementAmount(records, period), [period, records])
  const allPendingAmount = useMemo(() => sumPendingReimbursementAmount(records), [records])
  const previousMonth = (() => {
    const date = new Date(`${localDateKey().slice(0, 7)}-01T12:00:00`)
    date.setMonth(date.getMonth() - 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })()
  const previousMonthPending = pendingReimbursements.filter(({ record }) => record.date.startsWith(previousMonth))

  useEffect(() => { setPage(1) }, [period, records.length])

  return (
    <section className={`records-panel ${embedded ? 'records-panel--embedded' : ''}`}>
      {showHeading && <div className="panel-heading panel-heading--list">
        <div><span className="section-kicker">{periodLabel}</span><h2>加班明细</h2></div>
        <span className="record-count">{filteredRecords.length} 笔</span>
      </div>}
      {pendingReimbursements.length > 0 && <aside className="reimbursement-reminder" role="status">
        <div className="reimbursement-reminder__icon"><CalendarCheck2 size={18} /></div>
        <div className="reimbursement-reminder__content">
          <strong>有 {pendingReimbursements.length} 笔报销已申报但未到账</strong>
          <p>最早一笔是 {pendingReimbursements[0].record.date}，已经等待 {pendingReimbursements[0].waitingDays} 天。</p>
          {previousMonthPending.length > 0 && <p>上个月还有 {previousMonthPending.length} 笔未到账，最早已等待 {previousMonthPending[0].waitingDays} 天。</p>}
        </div>
        <div className="reimbursement-reminder__amounts">
          <div><span>{periodLabel}未到账</span><strong>¥{formatCurrency(pendingAmount)}</strong></div>
          <div><span>全部未到账</span><strong>¥{formatCurrency(allPendingAmount)}</strong></div>
        </div>
      </aside>}
      {filteredRecords.length === 0 ? (
        <div className="empty-state"><div className="empty-state__icon"><Inbox size={22} /></div><strong>{periodLabel}还没有加班记录</strong><p>从左侧添加这段时间的第一笔记录。</p></div>
      ) : (
        <>
          <div className="record-list">
            {visibleRecords.map((record) => (
              <article className="record-row" key={record.id}>
                <div className="record-date"><strong>{new Date(`${record.date}T00:00:00`).getDate().toString().padStart(2, '0')}</strong><span>{dateFormatter.format(new Date(`${record.date}T00:00:00`)).replace(/^\d+月/, '')}</span></div>
                <button className="record-main record-edit-trigger" type="button" onClick={() => onEdit(record)} aria-label={`编辑 ${record.date} 的加班记录`}><div className="record-title"><strong>{record.note || '未填写备注'}</strong><span className="record-badge">{record.tookTaxi ? taxiProviderLabel(record) : '自行回家'}</span>{record.tookTaxi && <span className={`record-status record-status--${record.reimbursementStatus || 'unsubmitted'}`}>{reimbursementStatusLabel(record.reimbursementStatus)}</span>}</div><div className="record-meta"><span>加班日</span>{record.tookTaxi && <span><CarFront size={14} />¥{formatCurrency(record.taxiCost)}</span>}{record.tookTaxi && record.reimbursementStatus === 'paid' && record.reimbursementPaidAt && <span><CalendarCheck2 size={14} />到账 {record.reimbursementPaidAt}</span>}</div></button>
                <div className="row-actions"><button className="icon-button" onClick={() => onEdit(record)} aria-label="编辑记录" title="编辑记录"><Edit3 size={16} /></button><button className="icon-button icon-button--danger" onClick={() => onDelete(record.id)} aria-label="删除记录" title="删除记录"><Trash2 size={16} /></button></div>
              </article>
            ))}
          </div>
          {totalPages > 1 && <nav className="record-pagination" aria-label="加班明细分页"><button className="icon-button" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} aria-label="上一页" title="上一页"><ChevronLeft size={18} /></button><span>第 {currentPage} / {totalPages} 页</span><button className="icon-button" type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} aria-label="下一页" title="下一页"><ChevronRight size={18} /></button></nav>}
        </>
      )}
    </section>
  )
})
