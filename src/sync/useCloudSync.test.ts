import { describe, expect, it } from 'vitest'
import { createSyncController } from './useCloudSync'
import { markChangedRecords } from './useCloudSync'
import type { SyncRecord } from './types'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('sync controller factory', () => {
  it('starts disconnected without Worker configuration', () => {
    const controller = createSyncController({ localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage(), now: () => '2026-08-06T10:00:00.000Z' })
    expect(controller.getState().status).toBe('disconnected')
  })

  it('creates a cloud client when URL and session password exist', () => {
    const localStorage = new MemoryStorage()
    const sessionStorage = new MemoryStorage()
    localStorage.setItem('overtime-worker-url', 'https://example.workers.dev')
    sessionStorage.setItem('overtime-sync-password', 'secret')
    const controller = createSyncController({ localStorage, sessionStorage, now: () => '2026-08-06T10:00:00.000Z', fetchImpl: async () => Response.json({ sha: null, data: { version: 1, updatedAt: '2026-08-06T10:00:00.000Z', records: [], tombstones: {} } }) })
    expect(controller.getState().status).toBe('synced')
  })

  it('updates timestamps only for records whose content changed', () => {
    const previous: SyncRecord[] = [
      { id: 'a', date: '2026-08-06', leaveTime: '21:00', hours: 3, tookTaxi: false, taxiCost: 0, note: 'old', updatedAt: '2026-08-06T09:00:00.000Z' },
      { id: 'b', date: '2026-08-05', leaveTime: '20:00', hours: 2, tookTaxi: false, taxiCost: 0, note: 'same', updatedAt: '2026-08-06T09:01:00.000Z' },
    ]
    const next = markChangedRecords(previous.map((item) => item.id === 'a' ? { ...item, note: 'new' } : item), previous, '2026-08-06T10:00:00.000Z')
    expect(next.find((item) => item.id === 'a')?.updatedAt).toBe('2026-08-06T10:00:00.000Z')
    expect(next.find((item) => item.id === 'b')?.updatedAt).toBe('2026-08-06T09:01:00.000Z')
  })
})
