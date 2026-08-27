import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, CalendarDays, List, Plus, TriangleAlert, X } from 'lucide-react'
import { OvertimeForm } from './components/OvertimeForm'
import { RecordList } from './components/RecordList'
import { SummaryCards } from './components/SummaryCards'
import { MonthOverview } from './components/MonthOverview'
import { RemoteControl } from './components/RemoteControl'
import { loadRecords, loadRemoteToken, loadRemoteVersion, saveRecords, saveRemoteVersion } from './storage'
import type { OvertimeRecord, RecordFormValue } from './types'
import { buildRecordSummary } from './records'
import { createRecordId, findRecordByDate, localDateKey } from './overtime'
import { DEFAULT_REMOTE_URL, loadLocalRecordsSnapshot, loadRemoteRecordsSnapshot, saveRemoteRecords } from './remote'
import { closedRecordModalState } from './modalState'

const today = localDateKey()
const emptyForm = (): RecordFormValue => ({ date: today, tookTaxi: false, taxiCost: '', taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted', reimbursementPaidAt: '', note: '' })

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
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const remoteVersionRef = useRef(loadRemoteVersion(window.sessionStorage) ?? 1)
  const remoteSaveQueueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    const loadInitialRecords = async () => {
      try {
        const snapshot = await loadLocalRecordsSnapshot()
        if (cancelled) return
        remoteVersionRef.current = snapshot.version
        saveRemoteVersion(window.sessionStorage, snapshot.version)
        setRecords(snapshot.records)
        saveRecords(snapshot.records)
        setRemoteMessage(`已从 data/overtime-records.json 读取 ${snapshot.records.length} 条记录（v${snapshot.version}）`)
        window.setTimeout(() => setRemoteMessage(''), 2200)
      } catch {
        if (!cancelled) setRemoteMessage('本地数据读取失败，已使用浏览器缓存')
      } finally {
        if (!cancelled) setIsInitialLoading(false)
      }
    }
    void loadInitialRecords()
    return () => { cancelled = true }
  }, [])

  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.date.localeCompare(a.date)), [records])
  const selectedPeriod = overviewMode === 'year' ? selectedMonth.slice(0, 4) : selectedMonth
  const periodLabel = overviewMode === 'year' ? `${selectedPeriod}年` : `${selectedPeriod.slice(0, 4)}年${Number(selectedPeriod.slice(5, 7))}月`
  const summary = useMemo(() => buildRecordSummary(records, selectedPeriod), [records, selectedPeriod])

  const enqueueRemoteSave = useCallback((nextRecords: OvertimeRecord[], token: string): Promise<void> => {
    const task = remoteSaveQueueRef.current.then(async () => {
      const result = await saveRemoteRecords(nextRecords, token, fetch, DEFAULT_REMOTE_URL, remoteVersionRef.current)
      remoteVersionRef.current = result.version
      saveRemoteVersion(window.sessionStorage, result.version)
      setRemoteMessage(`已实时保存到 GitHub（v${result.version}）`)
      window.setTimeout(() => setRemoteMessage(''), 2200)
    })
    remoteSaveQueueRef.current = task.catch(() => {})
    return task
  }, [])
  const updateRecords = useCallback((next: OvertimeRecord[]) => {
    setRecords(next)
    saveRecords(next)
    const token = loadRemoteToken(window.sessionStorage)
    if (token) void enqueueRemoteSave(next, token).catch((error) => {
      setRemoteMessage(error instanceof Error ? error.message : '实时保存失败')
    })
  }, [enqueueRemoteSave])
  const updateForm = useCallback((next: Partial<RecordFormValue>) => { setForm((current) => ({ ...current, ...next })); setError('') }, [])
  const closeRecordsModal = useCallback(() => { setIsRecordsModalOpen(false); setEditingId(null); setForm(emptyForm()); setError(''); setPendingOverwrite(null) }, [])
  const closeDetailsModal = useCallback(() => setIsDetailsModalOpen(false), [])
  const openNewRecordModal = useCallback((date = today) => { setIsDetailsModalOpen(false); setEditingId(null); setForm({ ...emptyForm(), date }); setIsRecordsModalOpen(true) }, [])
  const openDetailsModal = useCallback(() => { setIsRecordsModalOpen(false); setEditingId(null); setError(''); setPendingOverwrite(null); setIsDetailsModalOpen(true) }, [])

  const handleSubmit = () => {
    const taxiCost = form.tookTaxi ? Number(form.taxiCost || 0) : 0
    if (!form.date) return setError('请选择加班日期')
    const todayKey = localDateKey()
    if (form.date > todayKey) return setError('不能记录未来日期')
    if (form.tookTaxi && (!Number.isFinite(taxiCost) || taxiCost < 0)) return setError('请输入有效的打车费用')
    if (form.tookTaxi && !form.taxiProvider) return setError('请选择打车方式')
    if (form.tookTaxi && form.taxiProvider === 'other' && !form.taxiProviderOther.trim()) return setError('请填写其他打车方式')
    if (form.tookTaxi && form.reimbursementStatus === 'paid' && !form.reimbursementPaidAt) return setError('请选择到账日期')
    if (form.tookTaxi && form.reimbursementStatus === 'paid' && form.reimbursementPaidAt < form.date) return setError('到账日期不能早于加班日期')
    if (form.tookTaxi && form.reimbursementStatus === 'paid' && form.reimbursementPaidAt > todayKey) return setError('到账日期不能晚于今天')
    const record: OvertimeRecord = { id: editingId ?? createRecordId(), date: form.date, tookTaxi: form.tookTaxi, taxiCost, taxiProvider: form.tookTaxi ? form.taxiProvider : '', taxiProviderOther: form.tookTaxi && form.taxiProvider === 'other' ? form.taxiProviderOther.trim() : '', reimbursementStatus: form.reimbursementStatus, reimbursementPaidAt: form.tookTaxi && form.reimbursementStatus === 'paid' ? form.reimbursementPaidAt : '', note: form.note.trim() }
    const duplicate = !editingId ? findRecordByDate(records, record.date) : undefined
    if (duplicate) return setPendingOverwrite(record)
    if (editingId) {
      updateRecords(records.map((item) => item.id === editingId ? record : item))
      closeRecordsModal()
      setNotice('记录已更新')
    } else {
      updateRecords([record, ...records])
      const closed = closedRecordModalState()
      setIsRecordsModalOpen(closed.isOpen)
      setEditingId(closed.editingId)
      setForm(emptyForm())
      setNotice('记录已保存')
    }
    window.setTimeout(() => setNotice(''), 2200)
  }

  const handleEdit = useCallback((record: OvertimeRecord) => { setIsDetailsModalOpen(false); setEditingId(record.id); setForm({ date: record.date, tookTaxi: record.tookTaxi, taxiCost: record.tookTaxi ? String(record.taxiCost) : '', taxiProvider: record.tookTaxi ? record.taxiProvider || 'taxi' : '', taxiProviderOther: record.taxiProviderOther || '', reimbursementStatus: record.reimbursementStatus || 'unsubmitted', reimbursementPaidAt: record.reimbursementStatus === 'paid' ? (record.reimbursementPaidAt || localDateKey()) : '', note: record.note }); setIsRecordsModalOpen(true) }, [])
  const handleCalendarDateSelect = useCallback((date: string, record?: OvertimeRecord) => {
    if (record) return handleEdit(record)
    openNewRecordModal(date)
  }, [handleEdit, openNewRecordModal])
  const handleDelete = useCallback((id: string) => { if (window.confirm('确定删除这条加班记录吗？')) { const next = records.filter((record) => record.id !== id); updateRecords(next); if (editingId === id) closeRecordsModal(); setNotice('记录已删除'); window.setTimeout(() => setNotice(''), 2200) } }, [closeRecordsModal, editingId, records, updateRecords])

  useEffect(() => {
    if (!isRecordsModalOpen && !isDetailsModalOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [isDetailsModalOpen, isRecordsModalOpen])

  const loadRemote = useCallback(() => loadRemoteRecordsSnapshot(DEFAULT_REMOTE_URL), [])
  const handleRemoteLoaded = useCallback((snapshot: { records: OvertimeRecord[]; version: number }) => { remoteVersionRef.current = snapshot.version; saveRemoteVersion(window.sessionStorage, snapshot.version); setRecords(snapshot.records); saveRecords(snapshot.records); setRemoteMessage(`已读取 ${snapshot.records.length} 条 GitHub 记录（v${snapshot.version}）`); window.setTimeout(() => setRemoteMessage(''), 2200) }, [])
  const saveRemote = useCallback(async (token: string) => { await enqueueRemoteSave(records, token) }, [enqueueRemoteSave, records])

  const confirmOverwrite = () => { if (!pendingOverwrite) return; updateRecords(records.map((record) => record.date === pendingOverwrite.date ? { ...pendingOverwrite, id: record.id } : record)); setPendingOverwrite(null); closeRecordsModal(); setForm(emptyForm()); setNotice('已覆盖当天记录'); window.setTimeout(() => setNotice(''), 2200) }

  return <div className="app-shell">
    <div className="background-grid" />
    <main className="page-container">
      <header className="topbar"><div className="brand-lockup"><div className="brand-mark"><ArrowUpRight size={19} /></div><div><span className="brand-name">加班有数</span><span className="brand-subtitle">OVERTIME LOG</span></div></div><div className="topbar-tools"><div className="topbar-date"><CalendarDays size={16} />{monthLabel(new Date())}</div><RemoteControl records={records} onLoad={loadRemote} onLoaded={handleRemoteLoaded} onSave={saveRemote} /></div></header>
      <section className="hero"><div><p className="eyebrow">WORK LOG / 2026</p><h1>把每一次加班，<br /><span>记得清楚一点。</span></h1><p className="hero-copy">记录投入，也记录回家的路费。让辛苦有迹可循。</p></div><div className="hero-actions"><button className="outline-button outline-button--details" type="button" onClick={openDetailsModal}><List size={17} />加班明细</button><button className="outline-button" disabled={isInitialLoading} onClick={() => openNewRecordModal()}><Plus size={17} />{isInitialLoading ? '读取中' : '新增加班'}</button></div></section>
      <SummaryCards {...summary} periodLabel={overviewMode === 'year' ? '本年' : '本月'} />
      <MonthOverview records={records} selectedMonth={selectedMonth} mode={overviewMode} onMonthChange={setSelectedMonth} onModeChange={setOverviewMode} onDateSelect={handleCalendarDateSelect} />
      {isRecordsModalOpen && <div className="records-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRecordsModal() }}><section className="records-modal records-modal--form" role="dialog" aria-modal="true" aria-labelledby="records-modal-title"><header className="records-modal__header"><h2 id="records-modal-title">{editingId ? '编辑加班记录' : '新增加班记录'}</h2><button className="icon-button" type="button" onClick={closeRecordsModal} aria-label="关闭表单" title="关闭"><X size={20} /></button></header><div className="records-modal__body records-modal__body--form"><OvertimeForm value={form} isEditing={Boolean(editingId)} error={error} embedded onChange={updateForm} onSubmit={handleSubmit} /></div></section></div>}
      {isDetailsModalOpen && <div className="records-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetailsModal() }}><section className="records-modal records-modal--details" role="dialog" aria-modal="true" aria-labelledby="details-modal-title"><header className="records-modal__header"><h2 id="details-modal-title">{periodLabel}加班明细</h2><button className="icon-button" type="button" onClick={closeDetailsModal} aria-label="关闭加班明细" title="关闭"><X size={20} /></button></header><div className="records-modal__body records-modal__body--details"><RecordList records={sortedRecords} period={selectedPeriod} periodLabel={periodLabel} embedded showHeading={false} onEdit={handleEdit} onDelete={handleDelete} /></div></section></div>}
      {pendingOverwrite && <div className="overwrite-dialog" role="alertdialog" aria-modal="true"><div className="overwrite-dialog__icon"><TriangleAlert size={20} /></div><div><strong>这一天已经有记录</strong><p>{pendingOverwrite.date} 已经存在一笔加班记录，要覆盖原记录吗？</p><div className="overwrite-dialog__actions"><button className="secondary-button" onClick={() => setPendingOverwrite(null)}>取消</button><button className="primary-button" onClick={confirmOverwrite}>覆盖记录</button></div></div></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
      <footer className="footer-note">{remoteMessage || '数据保存在当前浏览器 · 输入 Token 后自动同步到 GitHub'}</footer>
    </main>
  </div>
}

export default App
