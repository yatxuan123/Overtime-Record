import { describe, expect, it } from 'vitest'
import { createRecordId, findRecordByDate, localDateKey } from './overtime'

describe('record dates', () => {
  it('finds an existing record for the same date', () => {
    const record = { id: '1', date: '2026-08-05', tookTaxi: false, taxiCost: 0, note: '' }
    expect(findRecordByDate([record], '2026-08-05')).toEqual(record)
  })

  it('formats a local date key', () => {
    expect(localDateKey(new Date('2026-08-08T12:00:00'))).toBe('2026-08-08')
  })

  it('uses randomUUID when the browser provides it', () => {
    expect(createRecordId({ randomUUID: () => 'provided-id' })).toBe('provided-id')
  })

  it('generates a UUID when randomUUID is unavailable', () => {
    const id = createRecordId({ getRandomValues: (bytes) => { bytes.fill(0xab); return bytes } })
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
