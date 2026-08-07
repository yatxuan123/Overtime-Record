import { describe, expect, it } from 'vitest'
import { buildMonthSummary, buildPeriodStats, calculateOvertimeHours, findRecordByDate, selectableLeaveHours, selectableLeaveTimes, STANDARD_END_TIME } from './overtime'

describe('overtime calculations', () => {
  it('calculates hours after the 21:00 standard end time', () => {
    expect(STANDARD_END_TIME).toBe('21:00')
    expect(calculateOvertimeHours('21:30')).toBe(0.5)
  })

  it('returns zero when leaving before the standard end time', () => {
    expect(calculateOvertimeHours('20:30')).toBe(0)
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

  it('builds summary cards from the selected month only', () => {
    const records = [
      { id: '1', date: '2026-07-05', hours: 1.5, leaveTime: '22:30', tookTaxi: true, taxiCost: 30, note: '' },
      { id: '2', date: '2026-07-10', hours: 2, leaveTime: '23:00', tookTaxi: false, taxiCost: 0, note: '' },
      { id: '3', date: '2026-08-01', hours: 4, leaveTime: '01:00', tookTaxi: true, taxiCost: 50, note: '' },
    ]
    expect(buildMonthSummary(records, '2026-07')).toEqual({ days: 2, hours: 3.5, taxiCost: 30 })
  })

  it('only allows selecting leave times from 21:00 onward', () => {
    expect(selectableLeaveHours()).toEqual(['21', '22', '23'])
    expect(selectableLeaveTimes()).toHaveLength(12)
    expect(selectableLeaveTimes()[0]).toBe('21:00')
    expect(selectableLeaveTimes()[11]).toBe('23:45')
  })
})
