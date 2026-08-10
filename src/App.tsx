import { useCallback, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, Plus, TriangleAlert } from 'lucide-react'
import { OvertimeForm } from './components/OvertimeForm'
import { RecordList } from './components/RecordList'
import { SummaryCards } from './components/SummaryCards'
import { MonthOverview } from './components/MonthOverview'
import { RemoteControl } from './components/RemoteControl'
import { loadRecords, saveRecords } from './storage'
import type { OvertimeRecord, RecordFormValue } from './types'
import { buildRecordSummary } from './records'
import { findRecordByDate, localDateKey } from './overtime'
import { DEFAULT_REMOTE_URL, loadRemoteRecords, saveRemoteRecords } from './remote'

const today = localDateKey()
const emptyForm = (): RecordFormValue => ({ date: today, tookTaxi: false, taxiCost: '', taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted', note: '' })

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
  const [overviewMode, setOverviewMode] = useState<'month' | 'year'>('month')
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7))

  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.date.localeCompare(a.date)), [records])
  const selectedPeriod = overviewMode === 'year' ? selectedMonth.slice(0, 4) : selectedMonth
  const periodLabel = overviewMode === 'year' ? `${selectedPeriod}年` : `${selectedPeriod.slice(0, 4)}年${Number(selectedPeriod.slice(5, 7))}月`
  const summary = useMemo(() => buildRecordSummary(records, selectedPeriod), [records, selectedPeriod])

  const updateRecords = useCallback((next: OvertimeRecord[]) => { setRecords(next); saveRecords(next) }, [])
  const updateForm = useCallback((next: Partial<RecordFormValue>) => { setForm((current) => ({ ...current, ...next })); setError('') }, [])

  const handleSubmit = () => {
    const taxiCost = form.tookTaxi ? Number(form.taxiCost || 0) : 0
    if (!form.date) return setError('请选择加班日期')
    if (form.tookTaxi && (!Number.isFinite(taxiCost) || taxiCost < 0)) return setError('请输入有效的打车费用')
    if (form.tookTaxi && !form.taxiProvider) return setError('请选择打车方式')
    if (form.tookTaxi && form.taxiProvider === 'other' && !form.taxiProviderOther.trim()) return setError('请填写其他打车方式')
    const record: OvertimeRecord = { id: editingId ?? crypto.randomUUID(), date: form.date, tookTaxi: form.tookTaxi, taxiCost, taxiProvider: form.tookTaxi ? form.taxiProvider : '', taxiProviderOther: form.tookTaxi && form.taxiProvider === 'other' ? form.taxiProviderOther.trim() : '', reimbursementStatus: form.reimbursementStatus, note: form.note.trim() }
    const duplicate = !editingId ? findRecordByDate(records, record.date) : undefined
    if (duplicate) return setPendingOverwrite(record)
    updateRecords(editingId ? records.map((item) => item.id === editingId ? record : item) : [record, ...records])
    setForm(emptyForm()); setEditingId(null); setNotice(editingId ? '记录已更新' : '记录已保存'); window.setTimeout(() => setNotice(''), 2200)
  }

  const handleEdit = useCallback((record: OvertimeRecord) => { setEditingId(record.id); setForm({ date: record.date, tookTaxi: record.tookTaxi, taxiCost: record.tookTaxi ? String(record.taxiCost) : '', taxiProvider: record.tookTaxi ? record.taxiProvider || 'taxi' : '', taxiProviderOther: record.taxiProviderOther || '', reimbursementStatus: record.reimbursementStatus || 'unsubmitted', note: record.note }); window.scrollTo({ top: 0, behavior: 'smooth' }) }, [])
  const handleCalendarDateSelect = useCallback((date: string, record?: OvertimeRecord) => {
    if (record) return handleEdit(record)
    setEditingId(null)
    setForm({ ...emptyForm(), date })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [handleEdit])
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
      <SummaryCards {...summary} periodLabel={overviewMode === 'year' ? '本年' : '本月'} />
      <MonthOverview records={records} selectedMonth={selectedMonth} mode={overviewMode} onMonthChange={setSelectedMonth} onModeChange={setOverviewMode} onDateSelect={handleCalendarDateSelect} />
      <div className="workspace-grid"><OvertimeForm value={form} isEditing={Boolean(editingId)} error={error} onChange={updateForm} onSubmit={handleSubmit} onCancel={cancelEdit} /><RecordList records={sortedRecords} period={selectedPeriod} periodLabel={periodLabel} onEdit={handleEdit} onDelete={handleDelete} /></div>
      {pendingOverwrite && <div className="overwrite-dialog" role="alertdialog" aria-modal="true"><div className="overwrite-dialog__icon"><TriangleAlert size={20} /></div><div><strong>这一天已经有记录</strong><p>{pendingOverwrite.date} 已经存在一笔加班记录，要覆盖原记录吗？</p><div className="overwrite-dialog__actions"><button className="secondary-button" onClick={() => setPendingOverwrite(null)}>取消</button><button className="primary-button" onClick={confirmOverwrite}>覆盖记录</button></div></div></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
      <footer className="footer-note">{remoteMessage || '数据保存在当前浏览器 · GitHub 仅在手动点击时访问'}</footer>
    </main>
  </div>
}

export default App
