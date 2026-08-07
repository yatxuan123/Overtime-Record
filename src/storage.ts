import type { OvertimeRecord } from './types'
import { calculateOvertimeHours, leaveTimeFromLegacyHours } from './overtime'
import { emptyEnvelope, normalizeEnvelope } from './sync/data'
import type { SyncCache, SyncRecord } from './sync/types'

const STORAGE_KEY = 'overtime-records-v1'
const SYNC_CACHE_KEY = 'overtime-sync-v1'
const WORKER_URL_KEY = 'overtime-worker-url'
const SESSION_PASSWORD_KEY = 'overtime-sync-password'
const REMOTE_TOKEN_KEY = 'overtime-github-token'

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
    const records = legacy.filter(isRecord).map((item): SyncRecord => {
      const leaveTime = item.leaveTime ?? leaveTimeFromLegacyHours(item.hours ?? 0)
      return { ...item, leaveTime, hours: calculateOvertimeHours(leaveTime), updatedAt: now }
    })
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

export function loadRemoteToken(storage: Storage): string {
  return storage.getItem(REMOTE_TOKEN_KEY) ?? ''
}

export function saveRemoteToken(storage: Storage, token: string): void {
  if (token) storage.setItem(REMOTE_TOKEN_KEY, token)
  else storage.removeItem(REMOTE_TOKEN_KEY)
}

export function loadRecords(): OvertimeRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRecord).map((record) => {
      const leaveTime = record.leaveTime ?? leaveTimeFromLegacyHours(record.hours ?? 0)
      return { ...record, leaveTime, hours: calculateOvertimeHours(leaveTime) }
    })
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
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<OvertimeRecord>
  return (
    typeof record.id === 'string' &&
    typeof record.date === 'string' &&
    (typeof record.hours === 'number' || typeof record.hours === 'undefined') &&
    (typeof record.leaveTime === 'string' || typeof record.leaveTime === 'undefined') &&
    typeof record.tookTaxi === 'boolean' &&
    typeof record.taxiCost === 'number' &&
    typeof record.note === 'string'
  )
}
