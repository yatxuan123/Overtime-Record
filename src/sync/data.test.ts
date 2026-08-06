import { describe, expect, it } from 'vitest'
import { emptyEnvelope, mergeEnvelopes } from './data'
import type { SyncEnvelope, SyncRecord } from './types'

const record = (id: string, updatedAt: string, date = '2026-08-06'): SyncRecord => ({
  id,
  date,
  leaveTime: '21:30',
  hours: 3.5,
  tookTaxi: false,
  taxiCost: 0,
  note: id,
  updatedAt,
})

const envelope = (records: SyncRecord[], tombstones: Record<string, string> = {}): SyncEnvelope => ({
  version: 1,
  updatedAt: '2026-08-06T10:00:00.000Z',
  records,
  tombstones,
})

describe('sync envelope merging', () => {
  it('keeps records added independently on different devices', () => {
    const merged = mergeEnvelopes(envelope([record('local', '2026-08-06T09:00:00.000Z')]), envelope([record('remote', '2026-08-06T09:30:00.000Z')]))
    expect(merged.records.map((item) => item.id)).toEqual(['remote', 'local'])
  })

  it('keeps the newest version of the same record', () => {
    const local = record('same', '2026-08-06T09:00:00.000Z')
    const remote = { ...record('same', '2026-08-06T10:00:00.000Z'), note: 'remote-newer' }
    expect(mergeEnvelopes(envelope([local]), envelope([remote])).records[0].note).toBe('remote-newer')
  })

  it('uses a newer tombstone to prevent deleted records from returning', () => {
    const merged = mergeEnvelopes(envelope([record('deleted', '2026-08-06T09:00:00.000Z')]), envelope([], { deleted: '2026-08-06T10:00:00.000Z' }))
    expect(merged.records).toEqual([])
    expect(merged.tombstones.deleted).toBe('2026-08-06T10:00:00.000Z')
  })

  it('keeps a record that is newer than an old tombstone', () => {
    const merged = mergeEnvelopes(envelope([record('restored', '2026-08-06T11:00:00.000Z')]), envelope([], { restored: '2026-08-06T10:00:00.000Z' }))
    expect(merged.records.map((item) => item.id)).toEqual(['restored'])
    expect(merged.tombstones.restored).toBeUndefined()
  })

  it('creates an empty versioned envelope', () => {
    expect(emptyEnvelope('2026-08-06T12:00:00.000Z')).toEqual({
      version: 1,
      updatedAt: '2026-08-06T12:00:00.000Z',
      records: [],
      tombstones: {},
    })
  })
})
