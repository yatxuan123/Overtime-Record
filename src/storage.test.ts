import { describe, expect, it, vi } from 'vitest'
import { loadRemoteToken, saveRemoteToken, loadRemoteVersion, saveRemoteVersion, loadReimbursementSnapshot, saveReimbursementSnapshot, saveRecords } from './storage'
import type { ReimbursementSnapshot } from './types'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('remote storage', () => {
  it('stores the GitHub token in persistent browser storage by default', () => {
    const local = new MemoryStorage()
    vi.stubGlobal('window', { localStorage: local })
    saveRemoteToken('github-token')
    expect(loadRemoteToken()).toBe('github-token')
    saveRemoteToken('')
    expect(loadRemoteToken()).toBe('')
    vi.unstubAllGlobals()
  })

  it('stores the last known GitHub data version', () => {
    const session = new MemoryStorage()
    expect(loadRemoteVersion(session)).toBeNull()
    saveRemoteVersion(session, 8)
    expect(loadRemoteVersion(session)).toBe(8)
    session.setItem('overtime-github-version', 'invalid')
    expect(loadRemoteVersion(session)).toBeNull()
  })

  it('round-trips batches and policy in the local snapshot', () => {
    const local = new MemoryStorage()
    vi.stubGlobal('window', { localStorage: local })
    const snapshot: ReimbursementSnapshot = {
      records,
      reimbursementBatches: [{ id: 'batch-1', periodStart: '2026-09-24', periodEnd: '2026-11-05', recordIds: ['taxi-1'], expectedAmount: 120, status: 'draft' }],
      reimbursementPolicy: { mode: 'batch', nextClaimDate: '2026-11-05' },
    }
    saveReimbursementSnapshot(snapshot)
    expect(loadReimbursementSnapshot()).toEqual({ ...snapshot, records: [{ ...records[0], reimbursementStatus: 'unsubmitted', taxiProviderOther: '' }] })
    vi.unstubAllGlobals()
  })

  it('does not erase existing batch metadata through the legacy saveRecords wrapper', () => {
    const local = new MemoryStorage()
    vi.stubGlobal('window', { localStorage: local })
    const snapshot: ReimbursementSnapshot = { records, reimbursementBatches: [{ id: 'batch-1', periodStart: '2026-09-24', periodEnd: '2026-11-05', recordIds: ['taxi-1'], expectedAmount: 120, status: 'draft' }], reimbursementPolicy: { mode: 'batch', nextClaimDate: '2026-11-05' } }
    saveReimbursementSnapshot(snapshot)
    const updated = [{ ...records[0], note: 'updated' }]
    saveRecords(updated)
    expect(loadReimbursementSnapshot().reimbursementBatches).toEqual(snapshot.reimbursementBatches)
    vi.unstubAllGlobals()
  })
})

const records = [{ id: 'taxi-1', date: '2026-09-24', tookTaxi: true, taxiCost: 120, taxiProvider: 'didi' as const, note: '' }]
