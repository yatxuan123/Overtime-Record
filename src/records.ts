import type { OvertimeRecord, ReimbursementStatus, TaxiProvider } from './types'

export const TAXI_PROVIDER_OPTIONS: ReadonlyArray<{ value: Exclude<TaxiProvider, ''>; label: string }> = [
  { value: 'taxi', label: '的士' },
  { value: 'didi', label: '滴滴' },
  { value: 'amap', label: '高德' },
  { value: 'other', label: '其他' },
]

export const REIMBURSEMENT_STATUS_OPTIONS: ReadonlyArray<{ value: ReimbursementStatus; label: string }> = [
  { value: 'unsubmitted', label: '未申报' },
  { value: 'submitted', label: '已申报' },
  { value: 'paid', label: '已到账' },
]

export type RecordSummary = { days: number; taxiDays: number; taxiCost: number; taxiPaidCost: number; taxiPendingCost: number }

export type PendingReimbursement = { record: OvertimeRecord; waitingDays: number }

const currencyFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function buildRecordSummary(records: OvertimeRecord[], period: string): RecordSummary {
  const filtered = filterRecordsByPeriod(records, period)
  const taxiRecords = filtered.filter((record) => record.tookTaxi)
  return {
    days: filtered.length,
    taxiDays: taxiRecords.length,
    taxiCost: taxiRecords.reduce((sum, record) => sum + record.taxiCost, 0),
    taxiPaidCost: taxiRecords.filter((record) => record.reimbursementStatus === 'paid').reduce((sum, record) => sum + record.taxiCost, 0),
    taxiPendingCost: taxiRecords.filter((record) => record.reimbursementStatus !== 'paid').reduce((sum, record) => sum + record.taxiCost, 0),
  }
}

export function filterRecordsByPeriod(records: OvertimeRecord[], period: string): OvertimeRecord[] {
  return records.filter((record) => record.date.startsWith(period))
}

export function paginateRecords(records: OvertimeRecord[], page: number, pageSize: number): OvertimeRecord[] {
  const start = Math.max(0, page - 1) * pageSize
  return records.slice(start, start + pageSize)
}

export function getPendingReimbursements(records: OvertimeRecord[], today: string): PendingReimbursement[] {
  return records
    .filter((record) => record.tookTaxi && record.reimbursementStatus === 'submitted' && record.date <= today)
    .map((record) => ({ record, waitingDays: differenceInDays(record.date, today) }))
    .sort((left, right) => right.waitingDays - left.waitingDays)
}

export function sumPendingReimbursementAmount(records: OvertimeRecord[], period?: string): number {
  return records
    .filter((record) => record.tookTaxi && record.reimbursementStatus === 'submitted' && (!period || record.date.startsWith(period)))
    .reduce((sum, record) => sum + record.taxiCost, 0)
}

export function normalizeRecord(value: unknown): OvertimeRecord | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<OvertimeRecord>
  if (typeof record.id !== 'string' || typeof record.date !== 'string' || typeof record.tookTaxi !== 'boolean' || typeof record.taxiCost !== 'number' || !Number.isFinite(record.taxiCost) || typeof record.note !== 'string') return null
  const provider = record.taxiProvider && TAXI_PROVIDER_OPTIONS.some((option) => option.value === record.taxiProvider) ? record.taxiProvider : (record.tookTaxi ? 'taxi' : '')
  const reimbursementStatus = record.tookTaxi && REIMBURSEMENT_STATUS_OPTIONS.some((option) => option.value === record.reimbursementStatus) ? record.reimbursementStatus : 'unsubmitted'
  const normalized: OvertimeRecord = {
    id: record.id,
    date: record.date,
    tookTaxi: record.tookTaxi,
    taxiCost: record.tookTaxi ? Math.max(0, record.taxiCost) : 0,
    taxiProvider: provider,
    taxiProviderOther: provider === 'other' && typeof record.taxiProviderOther === 'string' ? record.taxiProviderOther : '',
    reimbursementStatus,
    note: record.note,
  }
  if (reimbursementStatus === 'paid' && isDateKey(record.reimbursementPaidAt)) normalized.reimbursementPaidAt = record.reimbursementPaidAt
  return normalized
}

export function reimbursementStatusLabel(status?: ReimbursementStatus): string {
  return REIMBURSEMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label || '未申报'
}

export function taxiProviderLabel(record: Pick<OvertimeRecord, 'taxiProvider' | 'taxiProviderOther'>): string {
  if (record.taxiProvider === 'other') return record.taxiProviderOther?.trim() || '其他'
  return TAXI_PROVIDER_OPTIONS.find((option) => option.value === record.taxiProvider)?.label || '打车'
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function differenceInDays(start: string, end: string): number {
  const startTime = Date.parse(`${start}T00:00:00Z`)
  const endTime = Date.parse(`${end}T00:00:00Z`)
  return Math.max(0, Math.floor((endTime - startTime) / 86400000))
}
