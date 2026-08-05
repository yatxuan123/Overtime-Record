import type { OvertimeRecord } from './types'

export const STANDARD_END_TIME = '18:00'

export function calculateOvertimeHours(leaveTime: string): number {
  if (!/^\d{2}:\d{2}$/.test(leaveTime)) return 0
  const [hours, minutes] = leaveTime.split(':').map(Number)
  const leaveMinutes = hours * 60 + minutes
  const standardMinutes = 18 * 60
  return Math.max(0, Math.round((leaveMinutes - standardMinutes) / 30) / 2)
}

export function findRecordByDate(records: OvertimeRecord[], date: string): OvertimeRecord | undefined {
  return records.find((record) => record.date === date)
}

export function leaveTimeFromLegacyHours(hours: number): string {
  const totalMinutes = 18 * 60 + Math.max(0, hours) * 60
  const hour = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const minute = Math.round(totalMinutes % 60).toString().padStart(2, '0')
  return `${hour}:${minute}`
}

export type PeriodMode = 'week' | 'month' | 'year'
export type PeriodStat = { date: string; label: string; hours: number; taxiCost: number }

export function buildPeriodStats(records: OvertimeRecord[], mode: PeriodMode, referenceDate = new Date()): PeriodStat[] {
  const totalsByDate = new Map<string, { hours: number; taxiCost: number }>()
  for (const record of records) {
    const current = totalsByDate.get(record.date) ?? { hours: 0, taxiCost: 0 }
    current.hours += record.hours
    current.taxiCost += record.tookTaxi ? record.taxiCost : 0
    totalsByDate.set(record.date, current)
  }
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  if (mode === 'year') {
    return Array.from({ length: 12 }, (_, month) => {
      const monthKey = `${referenceDate.getFullYear()}-${String(month + 1).padStart(2, '0')}`
      let hours = 0
      let taxiCost = 0
      for (const [date, total] of totalsByDate) {
        if (date.startsWith(monthKey)) { hours += total.hours; taxiCost += total.taxiCost }
      }
      return { date: monthKey, label: `${month + 1}月`, hours, taxiCost }
    })
  }
  if (mode === 'week') {
    const mondayOffset = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - mondayOffset)
  } else {
    start.setDate(1)
  }
  const count = mode === 'week' ? 7 : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    const date = toDateKey(day)
    const total = totalsByDate.get(date) ?? { hours: 0, taxiCost: 0 }
    return { date, label: mode === 'week' ? `${day.getMonth() + 1}/${day.getDate()}` : `${day.getDate()}`, ...total }
  })
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
