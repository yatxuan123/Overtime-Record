import type { OvertimeRecord } from './types'
import { normalizeRecord } from './records'
import { emptyEnvelope, normalizeEnvelope } from './sync/data'
import type { SyncCache, SyncRecord } from './sync/types'

const STORAGE_KEY = 'overtime-records-v1'
const SYNC_CACHE_KEY = 'overtime-sync-v1'
const WORKER_URL_KEY = 'overtime-worker-url'
const SESSION_PASSWORD_KEY = 'overtime-sync-password'
const REMOTE_TOKEN_KEY = 'overtime-github-token'
const REMOTE_VERSION_KEY = 'overtime-github-version'

export function loadSyncCache(storage: Storage, now: string): SyncCache {
  try {
    const raw = storage.getItem(SYNC_CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SyncCache>
      const envelope = normalizeEnvelope(parsed.envelope)
      if (envelope && (typeof parsed.sha === 'string' || parsed.sha === null) && typeof parsed.isDirty === 'boolean') {
        return { envelope, sha: parsed.sha, isDirty: parsed.isDirty }
      }
      return { envelope: emptyEnvelope(now), sha: null, isDirty: false }
    }

    const legacyRaw = storage.getItem(STORAGE_KEY)
    if (!legacyRaw) return { envelope: emptyEnvelope(now), sha: null, isDirty: false }
    const legacy: unknown = JSON.parse(legacyRaw)
    if (!Array.isArray(legacy)) return { envelope: emptyEnvelope(now), sha: null, isDirty: false }
    const records = legacy.filter(isRecord).map((item): SyncRecord => ({ ...item, ...normalizeRecord(item), updatedAt: now }))
    return { envelope: { version: 1, updatedAt: now, records, tombstones: {} }, sha: null, isDirty: records.length > 0 }
  } catch {
    return { envelope: emptyEnvelope(now), sha: null, isDirty: false }
  }
}

export function saveSyncCache(storage: Storage, cache: SyncCache): void {
  try {
    storage.setItem(SYNC_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // 本地缓存不可用时，内存中的记录仍可继续使用。
  }
}

export function loadWorkerUrl(storage: Storage): string {
  return storage.getItem(WORKER_URL_KEY)?.trim().replace(/\/+$/, '') ?? ''
}

export function saveWorkerUrl(storage: Storage, url: string): void {
  const normalized = url.trim().replace(/\/+$/, '')
  if (normalized) storage.setItem(WORKER_URL_KEY, normalized)
  else storage.removeItem(WORKER_URL_KEY)
}

export function loadSessionPassword(storage: Storage): string {
  return storage.getItem(SESSION_PASSWORD_KEY) ?? ''
}

export function saveSessionPassword(storage: Storage, password: string): void {
  if (password) storage.setItem(SESSION_PASSWORD_KEY, password)
  else storage.removeItem(SESSION_PASSWORD_KEY)
}

export function loadRemoteToken(storage: Storage = window.localStorage): string {
  return storage.getItem(REMOTE_TOKEN_KEY) ?? ''
}

export function saveRemoteToken(token: string, storage: Storage = window.localStorage): void {
  if (token) storage.setItem(REMOTE_TOKEN_KEY, token)
  else storage.removeItem(REMOTE_TOKEN_KEY)
}

export function loadRemoteVersion(storage: Storage): number | null {
  const raw = storage.getItem(REMOTE_VERSION_KEY)
  if (!raw) return null
  const version = Number(raw)
  return Number.isInteger(version) && version >= 1 ? version : null
}

export function saveRemoteVersion(storage: Storage, version: number): void {
  if (Number.isInteger(version) && version >= 1) storage.setItem(REMOTE_VERSION_KEY, String(version))
}

export function loadRecords(): OvertimeRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeRecord).filter((record): record is OvertimeRecord => record !== null)
  } catch {
    return []
  }
}

export function saveRecords(records: OvertimeRecord[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // 浏览器禁用存储时仍保留当前页面状态，不阻塞录入流程。
  }
}

function isRecord(value: unknown): value is OvertimeRecord {
  return normalizeRecord(value) !== null
}
