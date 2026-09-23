import { describe, expect, it, vi } from 'vitest'
import { loadRemoteToken, saveRemoteToken, loadRemoteVersion, saveRemoteVersion } from './storage'

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
})
