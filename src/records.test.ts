import { describe, expect, it } from 'vitest'
import { buildRecordSummary, filterRecordsByPeriod, paginateRecords, normalizeRecord, TAXI_PROVIDER_OPTIONS } from './records'
import type { OvertimeRecord } from './types'

describe('record data', () => {
  it('summarizes the currently displayed month without overtime hours', () => {
    const records: OvertimeRecord[] = [
      { id: '1', date: '2026-07-05', tookTaxi: true, taxiCost: 30, taxiProvider: 'didi', taxiProviderOther: '', note: '' },
      { id: '2', date: '2026-07-10', tookTaxi: false, taxiCost: 0, taxiProvider: '', taxiProviderOther: '', note: '' },
      { id: '3', date: '2026-08-01', tookTaxi: true, taxiCost: 50, taxiProvider: 'amap', taxiProviderOther: '', note: '' },
    ]

    expect(buildRecordSummary(records, '2026-07')).toEqual({ days: 2, taxiDays: 1, taxiCost: 30 })
  })

  it('summarizes all months in a selected year', () => {
    const records: OvertimeRecord[] = [
      { id: '1', date: '2026-01-05', tookTaxi: true, taxiCost: 20, taxiProvider: 'taxi', taxiProviderOther: '', note: '' },
      { id: '2', date: '2026-12-10', tookTaxi: false, taxiCost: 0, taxiProvider: '', taxiProviderOther: '', note: '' },
      { id: '3', date: '2025-12-31', tookTaxi: true, taxiCost: 60, taxiProvider: 'other', taxiProviderOther: '顺风车', note: '' },
    ]

    expect(buildRecordSummary(records, '2026')).toEqual({ days: 2, taxiDays: 1, taxiCost: 20 })
  })

  it('filters details by the selected month or year', () => {
    const records: OvertimeRecord[] = [
      { id: '1', date: '2026-07-01', tookTaxi: false, taxiCost: 0, note: '' },
      { id: '2', date: '2026-08-01', tookTaxi: false, taxiCost: 0, note: '' },
      { id: '3', date: '2025-08-01', tookTaxi: false, taxiCost: 0, note: '' },
    ]

    expect(filterRecordsByPeriod(records, '2026-08').map((record) => record.id)).toEqual(['2'])
    expect(filterRecordsByPeriod(records, '2026').map((record) => record.id)).toEqual(['1', '2'])
  })

  it('paginates the filtered detail records', () => {
    const records: OvertimeRecord[] = Array.from({ length: 10 }, (_, index) => ({ id: String(index), date: `2026-08-${String(index + 1).padStart(2, '0')}`, tookTaxi: false, taxiCost: 0, note: '' }))

    expect(paginateRecords(records, 1, 8).map((record) => record.id)).toHaveLength(8)
    expect(paginateRecords(records, 2, 8).map((record) => record.id)).toEqual(['8', '9'])
  })

  it('converts old records into the simplified format', () => {
    expect(normalizeRecord({ id: 'legacy', date: '2026-08-08', leaveTime: '22:00', hours: 1, tookTaxi: true, taxiCost: 36, note: '旧记录' })).toEqual({
      id: 'legacy', date: '2026-08-08', tookTaxi: true, taxiCost: 36, taxiProvider: 'taxi', taxiProviderOther: '', note: '旧记录',
    })
  })

  it('offers the requested taxi provider choices', () => {
    expect(TAXI_PROVIDER_OPTIONS.map((option) => option.value)).toEqual(['taxi', 'didi', 'amap', 'other'])
  })
})
