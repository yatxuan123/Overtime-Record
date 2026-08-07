import type { OvertimeRecord, TaxiProvider } from './types'

export const TAXI_PROVIDER_OPTIONS: ReadonlyArray<{ value: Exclude<TaxiProvider, ''>; label: string }> = [
  { value: 'taxi', label: '的士' },
  { value: 'didi', label: '滴滴' },
  { value: 'amap', label: '高德' },
  { value: 'other', label: '其他' },
]

export type RecordSummary = { days: number; taxiDays: number; taxiCost: number }

export function buildRecordSummary(records: OvertimeRecord[], period: string): RecordSummary {
  const filtered = records.filter((record) => record.date.startsWith(period))
  return {
    days: filtered.length,
    taxiDays: filtered.filter((record) => record.tookTaxi).length,
    taxiCost: filtered.reduce((sum, record) => sum + (record.tookTaxi ? record.taxiCost : 0), 0),
  }
}

export function normalizeRecord(value: unknown): OvertimeRecord | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<OvertimeRecord>
  if (typeof record.id !== 'string' || typeof record.date !== 'string' || typeof record.tookTaxi !== 'boolean' || typeof record.taxiCost !== 'number' || !Number.isFinite(record.taxiCost) || typeof record.note !== 'string') return null
  const provider = record.taxiProvider && TAXI_PROVIDER_OPTIONS.some((option) => option.value === record.taxiProvider) ? record.taxiProvider : (record.tookTaxi ? 'taxi' : '')
  return {
    id: record.id,
    date: record.date,
    tookTaxi: record.tookTaxi,
    taxiCost: record.tookTaxi ? Math.max(0, record.taxiCost) : 0,
    taxiProvider: provider,
    taxiProviderOther: provider === 'other' && typeof record.taxiProviderOther === 'string' ? record.taxiProviderOther : '',
    note: record.note,
  }
}

export function taxiProviderLabel(record: Pick<OvertimeRecord, 'taxiProvider' | 'taxiProviderOther'>): string {
  if (record.taxiProvider === 'other') return record.taxiProviderOther?.trim() || '其他'
  return TAXI_PROVIDER_OPTIONS.find((option) => option.value === record.taxiProvider)?.label || '打车'
}
