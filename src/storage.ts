import type { OvertimeRecord } from './types'
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
