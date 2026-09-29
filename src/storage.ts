import type { OvertimeRecord, ReimbursementSnapshot } from './types'
import { normalizeRecord } from './records'

const STORAGE_KEY = 'overtime-records-v1'
const REMOTE_TOKEN_KEY = 'overtime-github-token'
const REMOTE_VERSION_KEY = 'overtime-github-version'

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
  return loadReimbursementSnapshot().records
}

export function loadReimbursementSnapshot(storage: Storage = window.localStorage): ReimbursementSnapshot {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return { records: [], reimbursementBatches: [], reimbursementPolicy: { mode: 'legacy' } }
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return { records: parsed.map(normalizeRecord).filter((record): record is OvertimeRecord => record !== null), reimbursementBatches: [], reimbursementPolicy: { mode: 'legacy' } }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { records?: unknown }).records)) return { records: [], reimbursementBatches: [], reimbursementPolicy: { mode: 'legacy' } }
    const value = parsed as { records: unknown[]; reimbursementBatches?: unknown; reimbursementPolicy?: unknown }
    return {
      records: value.records.map(normalizeRecord).filter((record): record is OvertimeRecord => record !== null),
      reimbursementBatches: Array.isArray(value.reimbursementBatches) ? value.reimbursementBatches as ReimbursementSnapshot['reimbursementBatches'] : [],
      reimbursementPolicy: value.reimbursementPolicy && typeof value.reimbursementPolicy === 'object' && (value.reimbursementPolicy as { mode?: unknown }).mode === 'batch'
        ? value.reimbursementPolicy as ReimbursementSnapshot['reimbursementPolicy']
        : { mode: 'legacy' },
    }
  } catch {
    return { records: [], reimbursementBatches: [], reimbursementPolicy: { mode: 'legacy' } }
  }
}

export function saveRecords(records: OvertimeRecord[], storage: Storage = window.localStorage): void {
  const current = loadReimbursementSnapshot(storage)
  saveReimbursementSnapshot({ records, reimbursementBatches: current.reimbursementBatches, reimbursementPolicy: current.reimbursementPolicy }, storage)
}

export function saveReimbursementSnapshot(snapshot: ReimbursementSnapshot, storage: Storage = window.localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // 浏览器禁用存储时仍保留当前页面状态，不阻塞录入流程。
  }
}
