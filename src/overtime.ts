import type { OvertimeRecord } from './types'

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function findRecordByDate(records: OvertimeRecord[], date: string): OvertimeRecord | undefined {
  return records.find((record) => record.date === date)
}
