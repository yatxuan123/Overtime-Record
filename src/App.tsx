import { useCallback, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, Plus, TriangleAlert } from 'lucide-react'
import { OvertimeForm } from './components/OvertimeForm'
import { RecordList } from './components/RecordList'
import { SummaryCards } from './components/SummaryCards'
import { StatsChart } from './components/StatsChart'
import { MonthOverview } from './components/MonthOverview'
import { RemoteControl } from './components/RemoteControl'
import { loadRecords, saveRecords } from './storage'
import type { OvertimeRecord, RecordFormValue } from './types'
import { calculateOvertimeHours, findRecordByDate, localDateKey, type PeriodMode } from './overtime'
import { DEFAULT_REMOTE_URL, loadRemoteRecords, saveRemoteRecords } from './remote'

const today = localDateKey()
const emptyForm = (): RecordFormValue => ({ date: today, leaveTime: '18:00', tookTaxi: false, taxiCost: '', note: '' })

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(date)
}

function App() {
  const [records, setRecords] = useState<OvertimeRecord[]>(loadRecords)
  const [remoteMessage, setRemoteMessage] = useState('')
  const [form, setForm] = useState<RecordFormValue>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingOverwrite, setPendingOverwrite] = useState<OvertimeRecord | null>(null)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7))

  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.date.localeCompare(a.date)), [records])
  const referenceDate = useMemo(() => new Date(`${selectedMonth}-01T12:00:00`), [selectedMonth])
  const summary = useMemo(() => {
    const month = selectedMonth
    const monthly = records.filter((record) => record.date.startsWith(month))
    return { days: monthly.length, hours: monthly.reduce((sum, record) => sum + record.hours, 0), taxiCost: monthly.reduce((sum, record) => sum + (record.tookTaxi ? record.taxiCost : 0), 0) }
  }, [records])

  const updateRecords = useCallback((next: OvertimeRecord[]) => { setRecords(next); saveRecords(next) }, [])
  const updateForm = useCallback((next: Partial<RecordFormValue>) => { setForm((current) => ({ ...current, ...next })); setError('') }, [])

  const handleSubmit = () => {
    const hours = calculateOvertimeHours(form.leaveTime)
    const taxiCost = form.tookTaxi ? Number(form.taxiCost || 0) : 0
    if (!form.date) return setError('请选择加班日期')
    if (hours <= 0) return setError('实际下班时间需要晚于 18:00')
    if (form.tookTaxi && (!Number.isFinite(taxiCost) || taxiCost < 0)) return setError('请输入有效的打车费用')
    const record: OvertimeRecord = { id: editingId ?? crypto.randomUUID(), date: form.date, leaveTime: form.leaveTime, hours, tookTaxi: form.tookTaxi, taxiCost, note: form.note.trim() }
    const duplicate = !editingId ? findRecordByDate(records, record.date) : undefined
    if (duplicate) return setPendingOverwrite(record)
    updateRecords(editingId ? records.map((item) => item.id === editingId ? record : item) : [record, ...records])
    setForm(emptyForm()); setEditingId(null); setNotice(editingId ? '记录已更新' : '记录已保存'); window.setTimeout(() => setNotice(''), 2200)
  }

  const handleEdit = useCallback((record: OvertimeRecord) => { setEditingId(record.id); setForm({ date: record.date, leaveTime: record.leaveTime || '18:00', tookTaxi: record.tookTaxi, taxiCost: record.tookTaxi ? String(record.taxiCost) : '', note: record.note }); window.scrollTo({ top: 0, behavior: 'smooth' }) }, [])
  const handleDelete = useCallback((id: string) => { if (window.confirm('确定删除这条加班记录吗？')) { setRecords((current) => { const next = current.filter((record) => record.id !== id); saveRecords(next); return next }); if (editingId === id) { setEditingId(null); setForm(emptyForm()) } setNotice('记录已删除'); window.setTimeout(() => setNotice(''), 2200) } }, [editingId])
  const cancelEdit = useCallback(() => { setEditingId(null); setForm(emptyForm()); setError('') }, [])

  const loadRemote = useCallback(() => loadRemoteRecords(DEFAULT_REMOTE_URL), [])
  const handleRemoteLoaded = useCallback((next: OvertimeRecord[]) => { setRecords(next); saveRecords(next); setRemoteMessage(`已读取 ${next.length} 条 GitHub 记录`); window.setTimeout(() => setRemoteMessage(''), 2200) }, [])
  const saveRemote = useCallback(async (token: string) => { await saveRemoteRecords(records, token); setRemoteMessage('已提交到 GitHub'); window.setTimeout(() => setRemoteMessage(''), 2200) }, [records])

  const confirmOverwrite = () => { if (!pendingOverwrite) return; updateRecords(records.map((record) => record.date === pendingOverwrite.date ? { ...pendingOverwrite, id: record.id } : record)); setPendingOverwrite(null); setForm(emptyForm()); setNotice('已覆盖当天记录'); window.setTimeout(() => setNotice(''), 2200) }

  return <div className="app-shell">
    <div className="background-grid" />
    <main className="page-container">
      <header className="topbar"><div className="brand-lockup"><div className="brand-mark"><ArrowUpRight size={19} /></div><div><span className="brand-name">加班有数</span><span className="brand-subtitle">OVERTIME LOG</span></div></div><div className="topbar-tools"><div className="topbar-date"><CalendarDays size={16} />{monthLabel(new Date())}</div><RemoteControl records={records} onLoad={loadRemote} onLoaded={handleRemoteLoaded} onSave={saveRemote} /></div></header>
      <section className="hero"><div><p className="eyebrow">WORK LOG / 2026</p><h1>把每一次加班，<br /><span>记得清楚一点。</span></h1><p className="hero-copy">记录投入，也记录回家的路费。让辛苦有迹可循。</p></div><button className="outline-button" onClick={() => { setEditingId(null); setForm(emptyForm()); document.querySelector('.form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}><Plus size={17} />新增加班</button></section>
      <SummaryCards {...summary} />
      <MonthOverview records={records} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      <StatsChart records={records} mode={periodMode} referenceDate={referenceDate} onModeChange={setPeriodMode} />
      <div className="workspace-grid"><OvertimeForm value={form} isEditing={Boolean(editingId)} error={error} onChange={updateForm} onSubmit={handleSubmit} onCancel={cancelEdit} /><RecordList records={sortedRecords} onEdit={handleEdit} onDelete={handleDelete} /></div>
      {pendingOverwrite && <div className="overwrite-dialog" role="alertdialog" aria-modal="true"><div className="overwrite-dialog__icon"><TriangleAlert size={20} /></div><div><strong>这一天已经有记录</strong><p>{pendingOverwrite.date} 已经存在一笔加班记录，要覆盖原记录吗？</p><div className="overwrite-dialog__actions"><button className="secondary-button" onClick={() => setPendingOverwrite(null)}>取消</button><button className="primary-button" onClick={confirmOverwrite}>覆盖记录</button></div></div></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
      <footer className="footer-note">{remoteMessage || '数据保存在当前浏览器 · GitHub 仅在手动点击时访问'}</footer>
    </main>
  </div>
}

export default App
