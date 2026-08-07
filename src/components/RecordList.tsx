import { memo } from 'react'
import { CarFront, Edit3, Inbox, Trash2 } from 'lucide-react'
import { taxiProviderLabel } from '../records'
import type { OvertimeRecord } from '../types'

type RecordListProps = { records: OvertimeRecord[]; onEdit: (record: OvertimeRecord) => void; onDelete: (id: string) => void }

const dateFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })

export const RecordList = memo(function RecordList({ records, onEdit, onDelete }: RecordListProps) {
  return (
    <section className="records-panel">
      <div className="panel-heading panel-heading--list">
        <div><span className="section-kicker">最近记录</span><h2>加班明细</h2></div>
        <span className="record-count">{records.length} 笔</span>
      </div>
      {records.length === 0 ? (
        <div className="empty-state"><div className="empty-state__icon"><Inbox size={22} /></div><strong>还没有加班记录</strong><p>从左侧添加第一笔，之后这里会按日期整理。</p></div>
      ) : (
        <div className="record-list">
          {records.map((record) => (
            <article className="record-row" key={record.id}>
              <div className="record-date"><strong>{new Date(`${record.date}T00:00:00`).getDate().toString().padStart(2, '0')}</strong><span>{dateFormatter.format(new Date(`${record.date}T00:00:00`)).replace(/^\d+月/, '')}</span></div>
              <div className="record-main"><div className="record-title"><strong>{record.note || '未填写备注'}</strong><span className="record-badge">{record.tookTaxi ? taxiProviderLabel(record) : '自行回家'}</span></div><div className="record-meta"><span>加班日</span>{record.tookTaxi && <span><CarFront size={14} />¥{record.taxiCost.toFixed(0)}</span>}</div></div>
              <div className="row-actions"><button className="icon-button" onClick={() => onEdit(record)} aria-label="编辑记录" title="编辑记录"><Edit3 size={16} /></button><button className="icon-button icon-button--danger" onClick={() => onDelete(record.id)} aria-label="删除记录" title="删除记录"><Trash2 size={16} /></button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
})
