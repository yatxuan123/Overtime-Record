import { describe, expect, it } from 'vitest'
import { buildPeriodStats, calculateOvertimeHours, findRecordByDate } from './overtime'

describe('overtime calculations', () => {
  it('calculates hours after the 18:00 standard end time', () => {
    expect(calculateOvertimeHours('21:30')).toBe(3.5)
  })

  it('returns zero when leaving before the standard end time', () => {
    expect(calculateOvertimeHours('17:30')).toBe(0)
  })

  it('finds an existing record for the same date', () => {
    const record = { id: '1', date: '2026-08-05', hours: 2, leaveTime: '20:00', tookTaxi: false, taxiCost: 0, note: '' }
    expect(findRecordByDate([record], '2026-08-05')).toEqual(record)
  })

  it('builds seven daily buckets for a weekly chart', () => {
    const records = [{ id: '1', date: '2026-08-05', hours: 3.5, leaveTime: '21:30', tookTaxi: true, taxiCost: 36, note: '' }]
    const stats = buildPeriodStats(records, 'week', new Date('2026-08-05T12:00:00'))
    expect(stats).toHaveLength(7)
    expect(stats.find((item) => item.date === '2026-08-05')?.hours).toBe(3.5)
  })
})
