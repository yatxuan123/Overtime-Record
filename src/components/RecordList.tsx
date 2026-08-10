import { memo, useEffect, useMemo, useState } from 'react'
import { CarFront, ChevronLeft, ChevronRight, Edit3, Inbox, Trash2 } from 'lucide-react'
import { filterRecordsByPeriod, paginateRecords, reimbursementStatusLabel, taxiProviderLabel } from '../records'
import type { OvertimeRecord } from '../types'

type RecordListProps = { records: OvertimeRecord[]; period: string; periodLabel: string; onEdit: (record: OvertimeRecord) => void; onDelete: (id: string) => void }

const PAGE_SIZE = 8
const dateFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })

export const RecordList = memo(function RecordList({ records, period, periodLabel, onEdit, onDelete }: RecordListProps) {
  const [page, setPage] = useState(1)
  const filteredRecords = useMemo(() => filterRecordsByPeriod(records, period), [period, records])
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleRecords = useMemo(() => paginateRecords(filteredRecords, currentPage, PAGE_SIZE), [currentPage, filteredRecords])

  useEffect(() => { setPage(1) }, [period, records.length])

  return (
    <section className="records-panel">
      <div className="panel-heading panel-heading--list">
        <div><span className="section-kicker">{periodLabel}</span><h2>加班明细</h2></div>
        <span className="record-count">{filteredRecords.length} 笔</span>
      </div>
      {filteredRecords.length === 0 ? (
        <div className="empty-state"><div className="empty-state__icon"><Inbox size={22} /></div><strong>{periodLabel}还没有加班记录</strong><p>从左侧添加这段时间的第一笔记录。</p></div>
      ) : (
        <>
          <div className="record-list">
            {visibleRecords.map((record) => (
              <article className="record-row" key={record.id}>
                <div className="record-date"><strong>{new Date(`${record.date}T00:00:00`).getDate().toString().padStart(2, '0')}</strong><span>{dateFormatter.format(new Date(`${record.date}T00:00:00`)).replace(/^\d+月/, '')}</span></div>
                <button className="record-main record-edit-trigger" type="button" onClick={() => onEdit(record)} aria-label={`编辑 ${record.date} 的加班记录`}><div className="record-title"><strong>{record.note || '未填写备注'}</strong><span className="record-badge">{record.tookTaxi ? taxiProviderLabel(record) : '自行回家'}</span>{record.tookTaxi && <span className={`record-status record-status--${record.reimbursementStatus || 'unsubmitted'}`}>{reimbursementStatusLabel(record.reimbursementStatus)}</span>}</div><div className="record-meta"><span>加班日</span>{record.tookTaxi && <span><CarFront size={14} />¥{record.taxiCost.toFixed(0)}</span>}</div></button>
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
