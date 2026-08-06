import { describe, expect, it } from 'vitest'
import { CloudSyncError, type CloudSnapshot, type CloudSyncClient } from './client'
import { SyncController } from './controller'
import { emptyEnvelope } from './data'
import type { SyncCache, SyncRecord } from './types'

const now = '2026-08-06T10:00:00.000Z'
const baseCache = (): SyncCache => ({ envelope: emptyEnvelope(now), sha: null, isDirty: false })
const record = (id: string, updatedAt = now): SyncRecord => ({
  id, date: '2026-08-06', leaveTime: '21:00', hours: 3, tookTaxi: false, taxiCost: 0, note: id, updatedAt,
})

function fakeClient(overrides: Partial<CloudSyncClient> = {}): CloudSyncClient {
  return {
    load: async () => ({ sha: 'remote-sha', data: emptyEnvelope(now) }),
    save: async (snapshot) => ({ ...snapshot, sha: 'saved-sha' }),
    ...overrides,
  }
}

describe('SyncController', () => {
  it('loads cloud data when connected', async () => {
    const remote = { ...emptyEnvelope(now), records: [record('remote')] }
    const controller = new SyncController({ client: fakeClient({ load: async () => ({ sha: 'sha', data: remote }) }), initialCache: baseCache(), persist: () => {}, now: () => now })
    await controller.connect()
    expect(controller.getState()).toMatchObject({ status: 'synced', cache: { sha: 'sha', isDirty: false } })
    expect(controller.getState().cache.envelope.records[0].id).toBe('remote')
  })

  it('keeps local changes pending when the network fails', async () => {
    let persisted: SyncCache | undefined
    const controller = new SyncController({
      client: fakeClient({ save: async () => { throw new CloudSyncError('network', 'offline') } }),
      initialCache: baseCache(), persist: (cache) => { persisted = cache }, now: () => now,
    })
    await controller.replaceRecords([record('local')])
    expect(controller.getState().status).toBe('pending')
    expect(persisted?.isDirty).toBe(true)
    expect(persisted?.envelope.records[0].id).toBe('local')
  })

  it('merges a conflict and retries once with the latest SHA', async () => {
    const saved: CloudSnapshot[] = []
    const remote = { ...emptyEnvelope('2026-08-06T11:00:00.000Z'), records: [record('remote', '2026-08-06T11:00:00.000Z')] }
    const controller = new SyncController({
      client: fakeClient({
        save: async (snapshot) => {
          saved.push(snapshot)
          if (saved.length === 1) throw new CloudSyncError('conflict', 'conflict', { sha: 'latest', data: remote })
          return { ...snapshot, sha: 'merged' }
        },
      }),
      initialCache: baseCache(), persist: () => {}, now: () => now,
    })
    await controller.replaceRecords([record('local')])
    expect(saved).toHaveLength(2)
    expect(saved[1].sha).toBe('latest')
    expect(saved[1].data.records.map((item) => item.id)).toEqual(['remote', 'local'])
    expect(controller.getState().status).toBe('synced')
  })

  it('creates a tombstone when deleting a record', async () => {
    const cache = baseCache()
    cache.envelope.records = [record('remove')]
    const controller = new SyncController({ client: undefined, initialCache: cache, persist: () => {}, now: () => now })
    await controller.deleteRecord('remove')
    expect(controller.getState().cache.envelope.records).toEqual([])
    expect(controller.getState().cache.envelope.tombstones.remove).toBe(now)
    expect(controller.getState().status).toBe('disconnected')
  })

  it('maps invalid credentials to unauthorized state', async () => {
    const controller = new SyncController({
      client: fakeClient({ load: async () => { throw new CloudSyncError('unauthorized', 'bad password') } }),
      initialCache: baseCache(), persist: () => {}, now: () => now,
    })
    await controller.connect()
    expect(controller.getState().status).toBe('unauthorized')
  })
})
