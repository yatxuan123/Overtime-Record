import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, FileCheck2, WalletCards } from 'lucide-react'
import { formatCurrency } from '../records'
import { createReimbursementBatch, getEligibleReimbursementRecords, getNextReimbursementPeriod, settleReimbursementBatch, submitReimbursementBatch } from '../reimbursement'
import { localDateKey } from '../overtime'
import type { OvertimeRecord, ReimbursementBatch, ReimbursementPolicy } from '../types'

type ReimbursementPanelProps = {
  records: OvertimeRecord[]
  batches: ReimbursementBatch[]
  policy: ReimbursementPolicy
  onUpdate: (records: OvertimeRecord[], batches: ReimbursementBatch[], policy: ReimbursementPolicy) => void
}

export function ReimbursementPanel({ records, batches, policy, onUpdate }: ReimbursementPanelProps) {
  const [nextClaimDate, setNextClaimDate] = useState(policy.nextClaimDate ?? '')
  const [lastClaimDate, setLastClaimDate] = useState(policy.lastClaimDate ?? '')
  const [paidAmounts, setPaidAmounts] = useState<Record<string, string>>({})
  const [paidDates, setPaidDates] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const period = useMemo(() => policy.nextClaimDate ? getNextReimbursementPeriod(batches, policy.nextClaimDate, policy.lastClaimDate) : null, [batches, policy.lastClaimDate, policy.nextClaimDate])
  const eligible = useMemo(() => period ? getEligibleReimbursementRecords(records, batches, period) : [], [batches, period, records])
  const eligibleAmount = eligible.reduce((sum, record) => sum + record.taxiCost, 0)

  const savePolicy = () => {
    if (!nextClaimDate || (lastClaimDate && nextClaimDate <= lastClaimDate)) return setError('下一次申报日必须晚于上次申报日')
    setError('')
    onUpdate(records, batches, { mode: 'batch', lastClaimDate: lastClaimDate || undefined, nextClaimDate })
  }

  const createBatch = () => {
    if (!period || eligible.length === 0) return
    const batch = createReimbursementBatch(eligible, period)
    const nextRecords = records.map((record) => eligible.some((item) => item.id === record.id) ? { ...record, reimbursementBatchId: batch.id } : record)
    onUpdate(nextRecords, [...batches, batch], policy)
  }

  const submitBatch = (batch: ReimbursementBatch) => {
    try {
      const submitted = submitReimbursementBatch(batch)
      const nextRecords = records.map((record) => batch.recordIds.includes(record.id) ? { ...record, reimbursementStatus: 'submitted' as const } : record)
      onUpdate(nextRecords, batches.map((item) => item.id === batch.id ? submitted : item), policy)
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '批次提交失败') }
  }

  const settleBatch = (batch: ReimbursementBatch) => {
    const raw = paidAmounts[batch.id]
    if (!raw || !paidDates[batch.id]) return setError('请填写实际到账金额和到账日期')
    try {
      const settled = settleReimbursementBatch(batch, Number(raw), paidDates[batch.id])
      const nextRecords = records.map((record) => batch.recordIds.includes(record.id) ? { ...record, reimbursementStatus: 'paid' as const, reimbursementPaidAt: settled.paidAt } : record)
      onUpdate(nextRecords, batches.map((item) => item.id === batch.id ? settled : item), policy)
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '登记到账失败') }
  }

  return <section className="reimbursement-panel" aria-labelledby="reimbursement-panel-title">
    <div className="reimbursement-panel__header">
      <div><span className="section-kicker">BATCH REIMBURSEMENT</span><h2 id="reimbursement-panel-title">批次报销</h2></div>
      {policy.nextClaimDate && <span className="reimbursement-panel__next"><CalendarClock size={16} />下一次申报：{policy.nextClaimDate}</span>}
    </div>

    <div className="reimbursement-panel__settings">
      <label><span>上次申报日</span><input type="date" value={lastClaimDate} onChange={(event) => setLastClaimDate(event.target.value)} /></label>
      <label><span>下一次申报日</span><input type="date" value={nextClaimDate} onChange={(event) => setNextClaimDate(event.target.value)} /></label>
      <button className="secondary-button" type="button" onClick={savePolicy}>保存申报周期</button>
    </div>

    {period && <div className="reimbursement-panel__summary">
      <div><span>本期范围</span><strong>{period.start} 至 {period.end}</strong></div>
      <div><span>待申报</span><strong>待申报 {eligible.length} 笔 · ¥{formatCurrency(eligibleAmount)}</strong></div>
      <button className="primary-button" type="button" disabled={eligible.length === 0} onClick={createBatch}><FileCheck2 size={16} />生成本期申报</button>
    </div>}
    {error && <p className="form-error" role="alert">{error}</p>}

    <div className="reimbursement-batch-list">
      {batches.length === 0 ? <p className="reimbursement-panel__empty">还没有报销批次</p> : batches.slice().reverse().map((batch) => <article className="reimbursement-batch" key={batch.id}>
        <div className="reimbursement-batch__title"><strong>{batch.periodStart} 至 {batch.periodEnd}</strong><span>{batch.status === 'draft' ? '待提交' : batch.status === 'submitted' ? '已申报待到账' : batch.status === 'paid' ? '已到账' : '被驳回'}</span></div>
        <div className="reimbursement-batch__meta"><span>{batch.recordIds.length} 笔</span><span>预计 ¥{formatCurrency(batch.expectedAmount)}</span>{batch.actualPaidAmount !== undefined && <span>实际 ¥{formatCurrency(batch.actualPaidAmount)}</span>}{batch.actualPaidAmount !== undefined && <span>差额 ¥{formatCurrency(batch.actualPaidAmount - batch.expectedAmount)}</span>}</div>
        {batch.status === 'draft' && <button className="secondary-button" type="button" onClick={() => submitBatch(batch)}><CheckCircle2 size={15} />提交本批次</button>}
        {batch.status === 'submitted' && <div className="reimbursement-batch__settle"><label><span>实际到账金额</span><input type="number" min="0" step="0.01" value={paidAmounts[batch.id] ?? ''} onChange={(event) => setPaidAmounts((current) => ({ ...current, [batch.id]: event.target.value }))} /></label><label><span>到账日期</span><input type="date" min={batch.submittedAt} value={paidDates[batch.id] ?? ''} onChange={(event) => setPaidDates((current) => ({ ...current, [batch.id]: event.target.value }))} /></label><button className="secondary-button" type="button" onClick={() => settleBatch(batch)}><WalletCards size={15} />登记本批次到账</button></div>}
        {batch.status === 'paid' && <small>核对结果：{batch.reconciliation === 'matched' ? '金额一致' : batch.reconciliation === 'short_paid' ? '少到账' : batch.reconciliation === 'overpaid' ? '多到账' : '待核对'}</small>}
      </article>)}
    </div>
  </section>
}
