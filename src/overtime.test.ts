import { describe, expect, it } from 'vitest'
import { findRecordByDate, localDateKey } from './overtime'

describe('record dates', () => {
  it('finds an existing record for the same date', () => {
    const record = { id: '1', date: '2026-08-05', tookTaxi: false, taxiCost: 0, note: '' }
    expect(findRecordByDate([record], '2026-08-05')).toEqual(record)
  })

  it('formats a local date key', () => {
    expect(localDateKey(new Date('2026-08-08T12:00:00'))).toBe('2026-08-08')
  })
})
