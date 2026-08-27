import type { OvertimeRecord } from './types'

type RandomSource = {
  randomUUID?: () => string
  getRandomValues?: (bytes: Uint8Array) => Uint8Array
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function findRecordByDate(records: OvertimeRecord[], date: string): OvertimeRecord | undefined {
  return records.find((record) => record.date === date)
}

export function createRecordId(source: RandomSource = globalThis.crypto as RandomSource): string {
  if (typeof source.randomUUID === 'function') return source.randomUUID()
  if (typeof source.getRandomValues === 'function') {
    const bytes = source.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  const randomPart = Math.random().toString(36).slice(2, 12)
  return `${Date.now().toString(36)}-${randomPart}`
}
