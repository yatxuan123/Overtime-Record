import type { OvertimeRecord } from './types'
import { calculateOvertimeHours, leaveTimeFromLegacyHours } from './overtime'

const STORAGE_KEY = 'overtime-records-v1'

export function loadRecords(): OvertimeRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRecord).map((record) => {
      const leaveTime = record.leaveTime ?? leaveTimeFromLegacyHours(record.hours ?? 0)
      return { ...record, leaveTime, hours: calculateOvertimeHours(leaveTime) }
    })
  } catch {
    return []
  }
}

export function saveRecords(records: OvertimeRecord[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function isRecord(value: unknown): value is OvertimeRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<OvertimeRecord>
  return (
    typeof record.id === 'string' &&
    typeof record.date === 'string' &&
    (typeof record.hours === 'number' || typeof record.hours === 'undefined') &&
    (typeof record.leaveTime === 'string' || typeof record.leaveTime === 'undefined') &&
    typeof record.tookTaxi === 'boolean' &&
    typeof record.taxiCost === 'number' &&
    typeof record.note === 'string'
  )
}
