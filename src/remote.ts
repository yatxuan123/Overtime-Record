import type { OvertimeRecord } from './types'
import { normalizeRecord } from './records'

export const DEFAULT_REMOTE_URL = 'https://raw.githubusercontent.com/yatxuan123/Overtime-Record/main/data/overtime-records.json'
export const DEFAULT_LOCAL_DATA_URL = `${import.meta.env.BASE_URL}data/overtime-records.json`

type FetchImpl = typeof fetch
export type RemoteRecordsSnapshot = { records: OvertimeRecord[]; version: number }
export type RemoteSaveResult = { sha: string; version: number }

export async function loadLocalRecords(localUrl = DEFAULT_LOCAL_DATA_URL, fetchImpl: FetchImpl = fetch): Promise<OvertimeRecord[]> {
  const snapshot = await loadLocalRecordsSnapshot(localUrl, fetchImpl)
  return snapshot.records
}

export async function loadLocalRecordsSnapshot(localUrl = DEFAULT_LOCAL_DATA_URL, fetchImpl: FetchImpl = fetch): Promise<RemoteRecordsSnapshot> {
  const response = await fetchImpl(localUrl, { cache: 'no-store' })
  if (!response.ok) throw new Error(`本地数据读取失败（HTTP ${response.status}）`)
  const data: unknown = await response.json()
  return parseRecordsSnapshot(data, '本地')
}

export async function loadRemoteRecords(remoteUrl = DEFAULT_REMOTE_URL, fetchImpl: FetchImpl = fetch): Promise<OvertimeRecord[]> {
  const snapshot = await loadRemoteRecordsSnapshot(remoteUrl, fetchImpl)
  return snapshot.records
}

export async function loadRemoteRecordsSnapshot(remoteUrl = DEFAULT_REMOTE_URL, fetchImpl: FetchImpl = fetch): Promise<RemoteRecordsSnapshot> {
  const cacheBustedUrl = `${remoteUrl}${remoteUrl.includes('?') ? '&' : '?'}v=${Date.now()}`
  const response = await fetchImpl(cacheBustedUrl, { cache: 'no-store' })
  if (response.status === 404) return { records: [], version: 0 }
  if (!response.ok) throw new Error(`远程数据读取失败（HTTP ${response.status}）`)
  const data: unknown = await response.json()
  return parseRecordsSnapshot(data, '远程')
}

export async function saveRemoteRecords(records: OvertimeRecord[], token: string, fetchImpl: FetchImpl = fetch, remoteUrl = DEFAULT_REMOTE_URL, expectedVersion?: number): Promise<RemoteSaveResult> {
  if (!token.trim()) throw new Error('请输入 GitHub Token')
  const apiUrl = toContentsApiUrl(remoteUrl)
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token.trim()}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const currentResponse = await fetchImpl(apiUrl, { headers })
  if (currentResponse.status === 401) throw new Error('GitHub Token 无效')
  if (currentResponse.status === 403) throw new Error(`GitHub 拒绝写入：${await githubMessage(currentResponse)}`)
  if (!currentResponse.ok && currentResponse.status !== 404) throw new Error(`GitHub 文件读取失败（HTTP ${currentResponse.status}）`)
  const current: unknown = currentResponse.status === 404 ? null : await currentResponse.json()
  const sha = current && typeof current === 'object' && typeof (current as { sha?: unknown }).sha === 'string' ? (current as { sha: string }).sha : undefined
  const currentVersion = getContentsVersion(current)
  if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
    throw new Error(`GitHub 数据版本冲突：远程为 v${currentVersion}，本地为 v${expectedVersion}，请先读取最新数据后再保存`)
  }
  const nextVersion = currentVersion + 1
  const response = await fetchImpl(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message: 'chore: 更新加班记录', content: encodeBase64(JSON.stringify({ version: nextVersion, records }, null, 2)), branch: 'main', ...(sha ? { sha } : {}) }),
  })
  if (response.status === 401) throw new Error('GitHub Token 无效')
  if (response.status === 403) throw new Error(`GitHub 拒绝写入：${await githubMessage(response)}`)
  if (response.status === 409) throw new Error('GitHub 文件已被其他操作更新，请重新保存')
  if (!response.ok) throw new Error(`GitHub 文件保存失败（HTTP ${response.status}）`)
  const saved: unknown = await response.json()
  const newSha = saved && typeof saved === 'object' && (saved as { content?: unknown }).content && typeof (saved as { content: { sha?: unknown } }).content.sha === 'string' ? (saved as { content: { sha: string } }).content.sha : ''
  if (!newSha) throw new Error('GitHub 返回了无效的保存结果')
  return { sha: newSha, version: nextVersion }
}

function parseRecordsSnapshot(data: unknown, source: string): RemoteRecordsSnapshot {
  if (Array.isArray(data)) return { records: normalizeRecords(data), version: 1 }
  if (data && typeof data === 'object' && Array.isArray((data as { records?: unknown }).records)) {
    const version = (data as { version?: unknown }).version
    if (version !== undefined && (!Number.isInteger(version) || (version as number) < 1)) throw new Error(`${source} JSON 版本号无效`)
    return { records: normalizeRecords((data as { records: unknown[] }).records), version: typeof version === 'number' ? version : 1 }
  }
  throw new Error(`${source} JSON 格式无效`)
}

function getContentsVersion(value: unknown): number {
  if (!value || typeof value !== 'object') return 0
  const content = (value as { content?: unknown }).content
  if (typeof content !== 'string' || !content.trim()) return 1
  try {
    const decoded = decodeBase64(content)
    const parsed: unknown = JSON.parse(decoded)
    return parseRecordsSnapshot(parsed, '远程').version
  } catch {
    throw new Error('GitHub 数据版本号无效，请先读取最新数据后再保存')
  }
}

function toContentsApiUrl(remoteUrl: string): string {
  const match = remoteUrl.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/)
  if (!match) throw new Error('远程地址必须是 raw.githubusercontent.com 的 JSON 地址')
  const [, owner, repo, branch, filePath] = match
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function githubMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string') return (body as { message: string }).message
  } catch {
    // GitHub 的错误响应通常是 JSON；非 JSON 时保留状态码作为上下文。
  }
  return `HTTP ${response.status}`
}

function normalizeRecords(values: unknown[]): OvertimeRecord[] {
  return values.map(normalizeRecord).filter((record): record is OvertimeRecord => record !== null)
}
