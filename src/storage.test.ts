import { describe, expect, it } from 'vitest'
import {
  loadSessionPassword,
  loadSyncCache,
  loadWorkerUrl,
  saveSessionPassword,
  saveSyncCache,
  saveWorkerUrl,
  loadRemoteToken,
  saveRemoteToken,
} from './storage'
import { emptyEnvelope } from './sync/data'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('sync storage', () => {
  it('migrates legacy records without deleting the legacy key', () => {
    const storage = new MemoryStorage()
    storage.setItem('overtime-records-v1', JSON.stringify([{
      id: 'legacy', date: '2026-08-05', hours: 3.5, tookTaxi: true, taxiCost: 30, note: 'legacy',
    }]))

    const cache = loadSyncCache(storage, '2026-08-06T10:00:00.000Z')

    expect(cache.isDirty).toBe(true)
    expect(cache.sha).toBeNull()
    expect(cache.envelope.records[0]).toMatchObject({ id: 'legacy', leaveTime: '21:30', updatedAt: '2026-08-06T10:00:00.000Z' })
    expect(storage.getItem('overtime-records-v1')).not.toBeNull()
  })

  it('returns an empty cache for malformed data', () => {
    const storage = new MemoryStorage()
    storage.setItem('overtime-sync-v1', '{bad json')
    expect(loadSyncCache(storage, '2026-08-06T10:00:00.000Z')).toEqual({
      envelope: emptyEnvelope('2026-08-06T10:00:00.000Z'), sha: null, isDirty: false,
    })
  })

  it('saves and reloads the sync cache', () => {
    const storage = new MemoryStorage()
    const cache = { envelope: emptyEnvelope('2026-08-06T10:00:00.000Z'), sha: 'abc', isDirty: true }
    saveSyncCache(storage, cache)
    expect(loadSyncCache(storage, '2026-08-06T11:00:00.000Z')).toEqual(cache)
  })

  it('stores the Worker URL separately from the session password', () => {
    const local = new MemoryStorage()
    const session = new MemoryStorage()
    saveWorkerUrl(local, 'https://example.workers.dev/')
    saveSessionPassword(session, 'secret')
    expect(loadWorkerUrl(local)).toBe('https://example.workers.dev')
    expect(loadSessionPassword(session)).toBe('secret')
  })

  it('stores the GitHub token for the current browser session', () => {
    const session = new MemoryStorage()
    saveRemoteToken(session, 'github-token')
    expect(loadRemoteToken(session)).toBe('github-token')
    saveRemoteToken(session, '')
    expect(loadRemoteToken(session)).toBe('')
  })
})
