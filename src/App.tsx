import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, CalendarDays, FileDown, List, Plus, X } from 'lucide-react'
import { OvertimeForm } from './components/OvertimeForm'
import { RecordList } from './components/RecordList'
import { SummaryCards } from './components/SummaryCards'
import { MonthOverview } from './components/MonthOverview'
import { RemoteControl } from './components/RemoteControl'
import { SummaryDetailModal } from './components/SummaryDetailModal'
import { Modal } from './components/Modal'
import { ConfirmDialog } from './components/ConfirmDialog'
import { loadRecords, loadRemoteToken, loadRemoteVersion, saveRecords, saveRemoteVersion } from './storage'
import type { OvertimeRecord, RecordFormValue } from './types'
import { buildRecordSummary, formatCurrency, sumCompTimeDays, sumPendingReimbursementAmount } from './records'
import { createRecordId, findRecordByDate, localDateKey } from './overtime'
import { DEFAULT_REMOTE_URL, loadLocalRecordsSnapshot, loadRemoteRecordsSnapshot, pickFresherSnapshot, saveRemoteRecords } from './remote'
import type { RemoteRecordsSnapshot } from './remote'
import { closedRecordModalState } from './modalState'
import { downloadTextFile, recordsToCsv, recordsToJson } from './export'

const today = localDateKey()
const monthFormatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' })
// 连续编辑时把多次改动合并成一次 GitHub 提交。
const AUTO_SYNC_DELAY_MS = 8000
const emptyForm = (): RecordFormValue => ({ date: today, tookTaxi: false, taxiCost: '', taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted', reimbursementPaidAt: '', note: '' })
type NoticeTone = 'success' | 'pending' | 'warning' | 'error'
type Notice = { message: string; tone: NoticeTone }

function validateForm(form: RecordFormValue): string[] {
  const errors: string[] = []
  const todayKey = localDateKey()
  if (!form.date) errors.push('请选择加班日期')
  else if (form.date > todayKey) errors.push('不能记录未来日期')
  if (form.tookTaxi) {
    const taxiCost = Number(form.taxiCost || 0)
    if (!Number.isFinite(taxiCost) || taxiCost < 0) errors.push('请输入有效的打车费用')
    if (!form.taxiProvider) errors.push('请选择打车方式')
    if (form.taxiProvider === 'other' && !form.taxiProviderOther.trim()) errors.push('请填写其他打车方式')
    if (form.reimbursementStatus === 'paid') {
      if (!form.reimbursementPaidAt) errors.push('请选择到账日期')
      else if (form.date && form.reimbursementPaidAt < form.date) errors.push('到账日期不能早于加班日期')
      else if (form.reimbursementPaidAt > todayKey) errors.push('到账日期不能晚于今天')
    }
  }
  return errors
}

function App() {
  const [records, setRecords] = useState<OvertimeRecord[]>(loadRecords)
  const [remoteMessage, setRemoteMessage] = useState('')
  const [form, setForm] = useState<RecordFormValue>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const [pendingOverwrite, setPendingOverwrite] = useState<OvertimeRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<OvertimeRecord | null>(null)
  const [overviewMode, setOverviewMode] = useState<'month' | 'year'>('month')
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7))
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [summaryDetail, setSummaryDetail] = useState<'pending' | 'comp-time' | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const remoteVersionRef = useRef(loadRemoteVersion(window.sessionStorage) ?? 1)
  const remoteSaveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const pendingSyncRef = useRef<{ records: OvertimeRecord[]; token: string } | null>(null)
  const syncTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    let messageTimer: number | null = null

    // 写入一份启动数据：同时更新状态、浏览器缓存和远端版本号（版本号供后续保存的冲突校验用）。
    const applyStartupSnapshot = (snapshot: RemoteRecordsSnapshot, message: string) => {
      remoteVersionRef.current = snapshot.version
      saveRemoteVersion(window.sessionStorage, snapshot.version)
      setRecords(snapshot.records)
      saveRecords(snapshot.records)
      setRemoteMessage(message)
      if (messageTimer !== null) window.clearTimeout(messageTimer)
      messageTimer = window.setTimeout(() => { setRemoteMessage(''); messageTimer = null }, 2200)
    }

    const loadInitialRecords = async () => {
      // 阶段一：先用构建快照渲染，首屏不等远端。
      let local: RemoteRecordsSnapshot | null = null
      try {
        local = await loadLocalRecordsSnapshot()
        if (cancelled) return
        applyStartupSnapshot(local, `已从 data/overtime-records.json 读取 ${local.records.length} 条记录（v${local.version}）`)
      } catch {
        if (!cancelled) setRemoteMessage('本地数据读取失败，已使用浏览器缓存')
      } finally {
        if (!cancelled) setIsInitialLoading(false)
      }

      // 阶段二：再拉 GitHub 实时数据，比快照新才采用；离线或仓库不可读时静默保留快照。
      try {
        const remote = await loadRemoteRecordsSnapshot()
        if (cancelled) return
        if (pickFresherSnapshot(local ?? { records: [], version: 0 }, remote) === remote) {
          applyStartupSnapshot(remote, `已自动同步 GitHub 最新数据（v${remote.version}）`)
        }
      } catch {
        // 保持快照即可，不打扰用户。
      }
    }

    void loadInitialRecords()
    return () => {
      cancelled = true
      if (messageTimer !== null) window.clearTimeout(messageTimer)
    }
  }, [])

  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.date.localeCompare(a.date)), [records])
  const selectedPeriod = overviewMode === 'year' ? selectedMonth.slice(0, 4) : selectedMonth
  const periodLabel = overviewMode === 'year' ? `${selectedPeriod}年` : `${selectedPeriod.slice(0, 4)}年${Number(selectedPeriod.slice(5, 7))}月`
  const summary = useMemo(() => buildRecordSummary(records, selectedPeriod), [records, selectedPeriod])
  const totalCompTimeDays = useMemo(() => sumCompTimeDays(records), [records])
  const allPendingCost = useMemo(() => sumPendingReimbursementAmount(records), [records])

  const showNotice = useCallback((message: string, tone: NoticeTone = 'success') => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    setNotice({ message, tone })
    noticeTimerRef.current = window.setTimeout(() => { setNotice(null); noticeTimerRef.current = null }, 3200)
  }, [])

  const enqueueRemoteSave = useCallback((nextRecords: OvertimeRecord[], token: string): Promise<void> => {
    const task = remoteSaveQueueRef.current.then(async () => {
      const result = await saveRemoteRecords(nextRecords, token, fetch, DEFAULT_REMOTE_URL, remoteVersionRef.current)
      remoteVersionRef.current = result.version
      saveRemoteVersion(window.sessionStorage, result.version)
      setRemoteMessage(`已实时保存到 GitHub（v${result.version}）`)
      showNotice(`已成功保存到 GitHub（v${result.version}）`, 'success')
      window.setTimeout(() => setRemoteMessage(''), 2200)
    })
    remoteSaveQueueRef.current = task.catch(() => {})
    return task
  }, [showNotice])

  const flushRemoteSave = useCallback(() => {
    if (syncTimerRef.current !== null) { window.clearTimeout(syncTimerRef.current); syncTimerRef.current = null }
    const pending = pendingSyncRef.current
    if (!pending) return
    pendingSyncRef.current = null
    void enqueueRemoteSave(pending.records, pending.token).catch((error) => {
      const message = error instanceof Error ? error.message : '实时保存失败'
      setRemoteMessage(message)
      showNotice(`本地已保存，但 GitHub 保存失败：${message}`, 'error')
    })
  }, [enqueueRemoteSave, showNotice])

  const cancelScheduledSync = useCallback(() => {
    pendingSyncRef.current = null
    if (syncTimerRef.current !== null) { window.clearTimeout(syncTimerRef.current); syncTimerRef.current = null }
  }, [])

  const scheduleRemoteSave = useCallback((nextRecords: OvertimeRecord[], token: string) => {
    pendingSyncRef.current = { records: nextRecords, token }
    if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current)
    syncTimerRef.current = window.setTimeout(flushRemoteSave, AUTO_SYNC_DELAY_MS)
  }, [flushRemoteSave])

  // 页面被切到后台时尽量把待同步的改动推出去，缩短只存在本机的窗口期。
  useEffect(() => {
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') flushRemoteSave() }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [flushRemoteSave])

  const updateRecords = useCallback((next: OvertimeRecord[]) => {
    setRecords(next)
    saveRecords(next)
    const token = loadRemoteToken()
    if (token) {
      showNotice('已保存到本地，稍后同步 GitHub…', 'pending')
      scheduleRemoteSave(next, token)
    } else showNotice('已保存到本地，未同步 GitHub：尚未配置 Token', 'warning')
  }, [scheduleRemoteSave, showNotice])

  const updateForm = useCallback((next: Partial<RecordFormValue>) => { setForm((current) => ({ ...current, ...next })); setError('') }, [])
  const closeRecordsModal = useCallback(() => { setIsRecordsModalOpen(false); setEditingId(null); setForm(emptyForm()); setError(''); setPendingOverwrite(null) }, [])
  const closeDetailsModal = useCallback(() => setIsDetailsModalOpen(false), [])
  const openNewRecordModal = useCallback((date = today) => { setSummaryDetail(null); setIsDetailsModalOpen(false); setEditingId(null); setForm({ ...emptyForm(), date }); setIsRecordsModalOpen(true) }, [])
  const openDetailsModal = useCallback(() => { setSummaryDetail(null); setIsRecordsModalOpen(false); setEditingId(null); setError(''); setPendingOverwrite(null); setIsDetailsModalOpen(true) }, [])
  const openPendingDetail = useCallback(() => setSummaryDetail('pending'), [])
  const openCompTimeDetail = useCallback(() => setSummaryDetail('comp-time'), [])

  const handleSubmit = () => {
    const errors = validateForm(form)
    if (errors.length > 0) return setError(errors.join('；'))
    const taxiCost = form.tookTaxi ? Number(form.taxiCost || 0) : 0
    const record: OvertimeRecord = { id: editingId ?? createRecordId(), date: form.date, tookTaxi: form.tookTaxi, taxiCost, taxiProvider: form.tookTaxi ? form.taxiProvider : '', taxiProviderOther: form.tookTaxi && form.taxiProvider === 'other' ? form.taxiProviderOther.trim() : '', reimbursementStatus: form.reimbursementStatus, reimbursementPaidAt: form.tookTaxi && form.reimbursementStatus === 'paid' ? form.reimbursementPaidAt : '', note: form.note.trim() }
    const duplicate = !editingId ? findRecordByDate(records, record.date) : undefined
    if (duplicate) return setPendingOverwrite(record)
    if (editingId) {
      updateRecords(records.map((item) => item.id === editingId ? record : item))
      closeRecordsModal()
    } else {
      updateRecords([record, ...records])
      const closed = closedRecordModalState()
      setIsRecordsModalOpen(closed.isOpen)
      setEditingId(closed.editingId)
      setForm(emptyForm())
    }
  }

  const handleEdit = useCallback((record: OvertimeRecord) => { setSummaryDetail(null); setIsDetailsModalOpen(false); setEditingId(record.id); setForm({ date: record.date, tookTaxi: record.tookTaxi, taxiCost: record.tookTaxi ? String(record.taxiCost) : '', taxiProvider: record.tookTaxi ? record.taxiProvider || 'taxi' : '', taxiProviderOther: record.taxiProviderOther || '', reimbursementStatus: record.reimbursementStatus || 'unsubmitted', reimbursementPaidAt: record.reimbursementStatus === 'paid' ? (record.reimbursementPaidAt || localDateKey()) : '', note: record.note }); setIsRecordsModalOpen(true) }, [])
  const handleSummaryEdit = useCallback((record: OvertimeRecord) => handleEdit(record), [handleEdit])
  const handleCalendarDateSelect = useCallback((date: string, record?: OvertimeRecord) => {
    if (record) return handleEdit(record)
    openNewRecordModal(date)
  }, [handleEdit, openNewRecordModal])

  const handleDelete = useCallback((record: OvertimeRecord) => setPendingDelete(record), [])
  const confirmDelete = () => {
    if (!pendingDelete) return
    updateRecords(records.filter((item) => item.id !== pendingDelete.id))
    if (editingId === pendingDelete.id) closeRecordsModal()
    setPendingDelete(null)
  }
  const confirmOverwrite = () => {
    if (!pendingOverwrite) return
    updateRecords(records.map((record) => record.date === pendingOverwrite.date ? { ...pendingOverwrite, id: record.id } : record))
    setPendingOverwrite(null)
    closeRecordsModal()
    setForm(emptyForm())
  }

  const exportAll = useCallback((format: 'csv' | 'json') => {
    const stamp = localDateKey()
    const count = sortedRecords.length
    if (format === 'csv') {
      downloadTextFile(`加班记录-${stamp}.csv`, 'text/csv;charset=utf-8', recordsToCsv(sortedRecords))
      showNotice(`已导出 ${count} 条记录为 CSV`, 'success')
      return
    }
    downloadTextFile(`加班记录-${stamp}.json`, 'application/json', recordsToJson(sortedRecords))
    showNotice(`已导出 ${count} 条记录为 JSON`, 'success')
  }, [showNotice, sortedRecords])

  const loadRemote = useCallback(() => loadRemoteRecordsSnapshot(DEFAULT_REMOTE_URL), [])
  const handleRemoteLoaded = useCallback((snapshot: { records: OvertimeRecord[]; version: number }) => { remoteVersionRef.current = snapshot.version; saveRemoteVersion(window.sessionStorage, snapshot.version); setRecords(snapshot.records); saveRecords(snapshot.records); setRemoteMessage(`已读取 ${snapshot.records.length} 条 GitHub 记录（v${snapshot.version}）`); window.setTimeout(() => setRemoteMessage(''), 2200) }, [])
  const saveRemote = useCallback(async (token: string) => {
    cancelScheduledSync()
    showNotice('正在保存到 GitHub…', 'pending')
    try {
      await enqueueRemoteSave(records, token)
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      showNotice(`GitHub 保存失败：${message}`, 'error')
      throw error
    }
  }, [cancelScheduledSync, enqueueRemoteSave, records, showNotice])

  return <div className="app-shell">
    <div className="background-grid" />
    <main className="page-container">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><ArrowUpRight size={19} /></div>
          <div><span className="brand-name">加班有数</span><span className="brand-subtitle">OVERTIME LOG</span></div>
        </div>
        <div className="topbar-tools">
          <div className="topbar-date"><CalendarDays size={16} />{monthFormatter.format(new Date())}</div>
          <RemoteControl records={records} onLoad={loadRemote} onLoaded={handleRemoteLoaded} onSave={saveRemote} />
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">WORK LOG / 2026</p>
          <h1>把每一次加班，<br /><span>记得清楚一点。</span></h1>
          <p className="hero-copy">记录投入，也记录回家的路费。让辛苦有迹可循。</p>
        </div>
        <div className="hero-actions">
          <button className="outline-button outline-button--details" type="button" onClick={openDetailsModal}><List size={17} />加班明细</button>
          <button className="outline-button" disabled={isInitialLoading} onClick={() => openNewRecordModal()}><Plus size={17} />{isInitialLoading ? '读取中' : '新增加班'}</button>
        </div>
      </section>

      <SummaryCards {...summary} allPendingCost={allPendingCost} totalCompTimeDays={totalCompTimeDays} periodLabel={overviewMode === 'year' ? '本年' : '本月'} isLoading={isInitialLoading} onPendingClick={openPendingDetail} onCompTimeClick={openCompTimeDetail} />
      <MonthOverview records={records} selectedMonth={selectedMonth} mode={overviewMode} onMonthChange={setSelectedMonth} onModeChange={setOverviewMode} onDateSelect={handleCalendarDateSelect} />

      {isRecordsModalOpen && <Modal onClose={closeRecordsModal} backdropClassName="records-modal-backdrop" panelClassName="records-modal records-modal--form" labelledBy="records-modal-title">
        <header className="records-modal__header">
          <h2 id="records-modal-title">{editingId ? '编辑加班记录' : '新增加班记录'}</h2>
          <button className="icon-button" type="button" onClick={closeRecordsModal} aria-label="关闭表单" title="关闭"><X size={20} /></button>
        </header>
        <div className="records-modal__body records-modal__body--form">
          <OvertimeForm value={form} isEditing={Boolean(editingId)} error={error} embedded onChange={updateForm} onSubmit={handleSubmit} />
        </div>
      </Modal>}

      {isDetailsModalOpen && <Modal onClose={closeDetailsModal} backdropClassName="records-modal-backdrop" panelClassName="records-modal records-modal--details" labelledBy="details-modal-title">
        <header className="records-modal__header">
          <h2 id="details-modal-title">{periodLabel}加班明细</h2>
          <div className="records-modal__header-actions">
            <button className="secondary-button" type="button" onClick={() => exportAll('csv')}><FileDown size={15} />导出 CSV</button>
            <button className="secondary-button" type="button" onClick={() => exportAll('json')}><FileDown size={15} />导出 JSON</button>
            <button className="icon-button" type="button" onClick={closeDetailsModal} aria-label="关闭加班明细" title="关闭"><X size={20} /></button>
          </div>
        </header>
        <div className="records-modal__body records-modal__body--details">
          <RecordList records={sortedRecords} period={selectedPeriod} periodLabel={periodLabel} embedded showHeading={false} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      </Modal>}

      {summaryDetail && <SummaryDetailModal mode={summaryDetail} records={records} onClose={() => setSummaryDetail(null)} onEdit={handleSummaryEdit} />}

      {pendingOverwrite && <ConfirmDialog
        title="这一天已经有记录"
        description={`${pendingOverwrite.date} 已经存在一笔加班记录，要覆盖原记录吗？`}
        confirmLabel="覆盖记录"
        onConfirm={confirmOverwrite}
        onCancel={() => setPendingOverwrite(null)}
      />}

      {pendingDelete && <ConfirmDialog
        title="删除这条记录？"
        description={`将删除 ${pendingDelete.date} 的加班记录${pendingDelete.tookTaxi ? `（含打车 ¥${formatCurrency(pendingDelete.taxiCost)}）` : ''}，删除后无法撤销。`}
        confirmLabel="删除"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />}

      {notice && <div className={`toast toast--${notice.tone}`} role="status">{notice.message}</div>}
      <footer className="footer-note">{remoteMessage || '数据保存在本机浏览器并同步到 GitHub · 页面加载时自动同步 GitHub 最新数据'}</footer>
    </main>
  </div>
}

export default App
