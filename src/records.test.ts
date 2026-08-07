import { describe, expect, it } from 'vitest'
import { buildRecordSummary, normalizeRecord, TAXI_PROVIDER_OPTIONS } from './records'
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

  it('converts old records into the simplified format', () => {
    expect(normalizeRecord({ id: 'legacy', date: '2026-08-08', leaveTime: '22:00', hours: 1, tookTaxi: true, taxiCost: 36, note: '旧记录' })).toEqual({
      id: 'legacy', date: '2026-08-08', tookTaxi: true, taxiCost: 36, taxiProvider: 'taxi', taxiProviderOther: '', note: '旧记录',
    })
  })

  it('offers the requested taxi provider choices', () => {
    expect(TAXI_PROVIDER_OPTIONS.map((option) => option.value)).toEqual(['taxi', 'didi', 'amap', 'other'])
  })
})
