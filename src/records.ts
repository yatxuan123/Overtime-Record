import { DEFAULT_HOLIDAY_TABLES, type HolidayTables } from './holidays'
import { localDateKey } from './overtime'
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
  { value: 'rejected', label: '被驳回' },
  { value: 'paid', label: '已到账' },
]

// 超过这个天数还没到账，提醒面板会升级为「已超期」。
export const NORMAL_REIMBURSEMENT_WINDOW_DAYS = 30
// 调休的有效期，以及进入「即将过期」提示的剩余天数。
export const COMP_TIME_VALIDITY_MONTHS = 3
export const COMP_TIME_EXPIRING_SOON_DAYS = 30

export type RecordSummary = { days: number; taxiDays: number; taxiCost: number; taxiPaidCost: number; taxiPendingCost: number }

export type PendingReimbursement = { record: OvertimeRecord; waitingDays: number }

export type CompTimeEntry = { record: OvertimeRecord; days: number; expiresAt: string; daysLeft: number; isExpired: boolean }

export type MonthBreakdown = { month: number; days: number; compDays: number; taxiCost: number; pendingCost: number }

export type YearBreakdown = { months: MonthBreakdown[]; days: number; compDays: number; taxiCost: number; pendingCost: number }

export type ReimbursementTiming = { average: number | null; longest: number | null; sampleSize: number }

export type RecordFilter = { status: ReimbursementStatus | 'all'; keyword: string }

const currencyFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function isWeekendDate(dateKey: string): boolean {
  if (!isDateKey(dateKey)) return false
  const date = new Date(`${dateKey}T12:00:00`)
  const day = date.getDay()
  return day === 0 || day === 6
}

// 调休天数按优先级判定：调休上班日 → 0；放假日 → 查表权重；周末 → 1；其余 → 0。
export function getCompTimeDays(record: Pick<OvertimeRecord, 'date'>, tables: HolidayTables = DEFAULT_HOLIDAY_TABLES): number {
  if (tables.makeupWorkdays.has(record.date)) return 0
  const holidayWeight = tables.holidayDates[record.date]
  if (typeof holidayWeight === 'number') return holidayWeight
  return isWeekendDate(record.date) ? 1 : 0
}

export function sumCompTimeDays(records: OvertimeRecord[], period?: string, tables: HolidayTables = DEFAULT_HOLIDAY_TABLES): number {
  return records
    .filter((record) => !period || record.date.startsWith(period))
    .reduce((sum, record) => sum + getCompTimeDays(record, tables), 0)
}

// 把每一条产生调休的记录换算成带有效期的条目，用于提示「即将过期 / 已过期」。
export function listCompTimeEntries(records: OvertimeRecord[], today: string, validityMonths = COMP_TIME_VALIDITY_MONTHS, tables: HolidayTables = DEFAULT_HOLIDAY_TABLES): CompTimeEntry[] {
  return records
    .map((record) => ({ record, days: getCompTimeDays(record, tables) }))
    .filter((entry) => entry.days > 0)
    .map((entry) => {
      const expiresAt = addMonths(entry.record.date, validityMonths)
      const daysLeft = signedDifferenceInDays(today, expiresAt)
      return { ...entry, expiresAt, daysLeft, isExpired: daysLeft < 0 }
    })
    .sort((left, right) => left.daysLeft - right.daysLeft)
}

export function isWithinDays(dateKey: string, today: string, days: number): boolean {
  return signedDifferenceInDays(today, dateKey) <= days
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

// 单遍聚合 12 个月，供年视图一次取用：比每个月各 filter 一次快，也避免同一套口径散在组件里。
export function buildYearBreakdown(records: OvertimeRecord[], year: string, tables: HolidayTables = DEFAULT_HOLIDAY_TABLES): YearBreakdown {
  const prefix = `${year}-`
  const months: MonthBreakdown[] = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, days: 0, compDays: 0, taxiCost: 0, pendingCost: 0 }))
  const totals = { days: 0, compDays: 0, taxiCost: 0, pendingCost: 0 }
  for (const record of records) {
    if (!record.date.startsWith(prefix)) continue
    const monthIndex = Number(record.date.slice(5, 7))
    if (!Number.isInteger(monthIndex) || monthIndex < 1 || monthIndex > 12) continue
    const bucket = months[monthIndex - 1]
    const compDays = getCompTimeDays(record, tables)
    bucket.days += 1
    bucket.compDays += compDays
    totals.days += 1
    totals.compDays += compDays
    if (!record.tookTaxi) continue
    bucket.taxiCost += record.taxiCost
    totals.taxiCost += record.taxiCost
    // 未到账口径与 sumPendingReimbursementAmount 保持一致：已申报 + 未申报 + 被驳回。
    if (record.reimbursementStatus !== 'paid') {
      bucket.pendingCost += record.taxiCost
      totals.pendingCost += record.taxiCost
    }
  }
  return { months, ...totals }
}

// 统计「加班日 → 到账日」隔了多久。缺到账日或日期倒挂的记录不计入，避免把脏数据算成负天数。
export function summarizeReimbursementTiming(records: OvertimeRecord[], period?: string): ReimbursementTiming {
  const cycles = records
    .filter((record) => record.tookTaxi && record.reimbursementStatus === 'paid' && (!period || record.date.startsWith(period)))
    .map((record) => isDateKey(record.reimbursementPaidAt) ? signedDifferenceInDays(record.date, record.reimbursementPaidAt) : -1)
    .filter((days) => days >= 0)
  if (cycles.length === 0) return { average: null, longest: null, sampleSize: 0 }
  const total = cycles.reduce((sum, days) => sum + days, 0)
  return { average: Math.round((total / cycles.length) * 10) / 10, longest: Math.max(...cycles), sampleSize: cycles.length }
}

// 按报销状态与关键字筛选。状态筛选只对「打了车」的记录有意义，关键字匹配备注、打车方式与日期。
export function filterRecords(records: OvertimeRecord[], filter: RecordFilter): OvertimeRecord[] {
  const keyword = filter.keyword.trim().toLowerCase()
  return records.filter((record) => {
    if (filter.status !== 'all' && (!record.tookTaxi || (record.reimbursementStatus ?? 'unsubmitted') !== filter.status)) return false
    if (!keyword) return true
    return [record.note, taxiProviderLabel(record), record.date, record.reimbursementPaidAt ?? ''].some((field) => field.toLowerCase().includes(keyword))
  })
}

export function paginateRecords(records: OvertimeRecord[], page: number, pageSize: number): OvertimeRecord[] {
  const start = Math.max(0, page - 1) * pageSize
  return records.slice(start, start + pageSize)
}

// 只包含「已申报但还没打款」的记录：这是已提交给公司、正在等待的钱。
export function getPendingReimbursements(records: OvertimeRecord[], today: string): PendingReimbursement[] {
  return records
    .filter((record) => record.tookTaxi && record.reimbursementStatus === 'submitted' && record.date <= today)
    .map((record) => ({ record, waitingDays: differenceInDays(record.date, today) }))
    .sort((left, right) => right.waitingDays - left.waitingDays)
}

// 被驳回的记录需要你重新提交，和「等待打款」是两种不同的待办。
export function getRejectedReimbursements(records: OvertimeRecord[]): OvertimeRecord[] {
  return records
    .filter((record) => record.tookTaxi && record.reimbursementStatus === 'rejected')
    .sort((left, right) => right.date.localeCompare(left.date))
}

// 包含所有「还没到我账上」的记录口径：已申报 + 未申报 + 被驳回，因为三者都是公司尚未支付的费用。
// 注意与 getPendingReimbursements 的差异是有意的：这里是「公司还欠我多少」，那里是「哪几笔正在等打款」。
export function sumPendingReimbursementAmount(records: OvertimeRecord[], period?: string): number {
  return records
    .filter((record) => record.tookTaxi && record.reimbursementStatus !== 'paid' && (!period || record.date.startsWith(period)))
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

function addMonths(dateKey: string, months: number): string {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setMonth(date.getMonth() + months)
  return localDateKey(date)
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function differenceInDays(start: string, end: string): number {
  return Math.max(0, signedDifferenceInDays(start, end))
}

function signedDifferenceInDays(start: string, end: string): number {
  const startTime = Date.parse(`${start}T00:00:00Z`)
  const endTime = Date.parse(`${end}T00:00:00Z`)
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return 0
  return Math.floor((endTime - startTime) / 86400000)
}
