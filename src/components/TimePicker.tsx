import { Check, ChevronDown, Clock3, X } from 'lucide-react'
import { useState } from 'react'

type TimePickerProps = { value: string; date: string; onChange: (value: string) => void }

const minuteOptions = ['00', '15', '30', '45']

export function TimePicker({ value, date, onChange }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value || '18:00')
  const [hour, minute] = draft.split(':')
  const dateLabel = date ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${date}T12:00:00`)) : '请选择日期'

  const openPicker = () => { setDraft(value || '18:00'); setOpen(true) }
  const confirm = () => { onChange(`${hour}:${minute}`); setOpen(false) }

  return <>
    <button className="time-display" type="button" onClick={openPicker} aria-label="选择实际下班时间"><Clock3 size={17} /><span><strong>{value || '18:00'}</strong><small>点击选择下班时间</small></span><ChevronDown size={17} /></button>
    {open && <div className="time-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}><section className="time-modal" role="dialog" aria-modal="true" aria-label="选择下班时间"><header className="time-modal__header"><div><span className="time-modal__eyebrow">实际下班时间</span><h3>{dateLabel}</h3></div><button className="time-modal__close" type="button" onClick={() => setOpen(false)} aria-label="关闭时间选择"><X size={24} /></button></header><div className="time-modal__hero"><strong>{hour}<i>:</i>{minute}</strong><span>加班基准时间为 18:00</span></div><div className="time-controls"><label><span>小时</span><select value={hour} onChange={(event) => setDraft(`${event.target.value}:${minute}`)}>{Array.from({ length: 24 }, (_, index) => <option key={index} value={String(index).padStart(2, '0')}>{String(index).padStart(2, '0')} 点</option>)}</select></label><label><span>分钟</span><select value={minute} onChange={(event) => setDraft(`${hour}:${event.target.value}`)}>{minuteOptions.map((item) => <option key={item} value={item}>{item} 分</option>)}</select></label></div><button className="time-confirm" type="button" onClick={confirm}><Check size={18} />完成</button></section></div>}
  </>
}
