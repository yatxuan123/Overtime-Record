import { CalendarDays, ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import { useMemo, useState } from 'react'

type DatePickerProps = { value: string; onChange: (value: string) => void }
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const pad = (value: number) => String(value).padStart(2, '0')
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function DatePicker({ value, onChange }: DatePickerProps) {
  const selected = value ? new Date(`${value}T12:00:00`) : new Date()
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1))
  const [draft, setDraft] = useState(value)
  const calendarDays = useMemo(() => {
    const firstDay = (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() + 6) % 7
    const count = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
    const prevCount = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate()
    return Array.from({ length: Math.ceil((firstDay + count) / 7) * 7 }, (_, index) => {
      const dayNumber = index - firstDay + 1
      if (dayNumber < 1) return { date: new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, prevCount + dayNumber), current: false }
      if (dayNumber > count) return { date: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, dayNumber - count), current: false }
      return { date: new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNumber), current: true }
    })
  }, [viewDate])
  const openPicker = () => { setDraft(value); setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1)); setOpen(true) }
  const confirm = () => { onChange(draft); setOpen(false) }
  const draftDate = draft ? new Date(`${draft}T12:00:00`) : selected
  const displayValue = value ? new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(selected) : '请选择日期'

  return <>
    <button className="date-display" type="button" onClick={openPicker} aria-label="选择加班日期"><CalendarDays size={17} /><span><strong>{displayValue}</strong><small>{value || '点击选择日期'}</small></span><ChevronRight size={17} /></button>
    {open && <div className="date-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}><section className="date-modal" role="dialog" aria-modal="true" aria-label="选择加班日期"><header className="date-modal__header"><div><span className="date-modal__eyebrow">加班日期</span><h3>{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(draftDate)}</h3></div><button className="date-modal__close" type="button" onClick={() => setOpen(false)} aria-label="关闭日期选择"><X size={24} /></button></header><div className="calendar-toolbar"><button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} aria-label="上个月"><ChevronLeft size={22} /></button><strong>{viewDate.getFullYear()} 年 {viewDate.getMonth() + 1} 月</strong><button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} aria-label="下个月"><ChevronRight size={22} /></button></div><div className="calendar-grid calendar-grid--head">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map(({ date, current }) => { const dateKey = keyOf(date); const selectedDay = dateKey === draft; return <button className={`calendar-day ${current ? '' : 'is-muted'} ${selectedDay ? 'is-selected' : ''}`} key={dateKey} type="button" onClick={() => setDraft(dateKey)}>{date.getDate()}</button> })}</div><button className="date-confirm" type="button" onClick={confirm}><Check size={18} />完成</button></section></div>}
  </>
}
