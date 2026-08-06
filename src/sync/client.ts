import { normalizeEnvelope } from './data'
import type { SyncEnvelope } from './types'

export type CloudSnapshot = {
  sha: string | null
  data: SyncEnvelope
}

export type CloudSyncErrorCode = 'unauthorized' | 'conflict' | 'invalid_response' | 'network' | 'server_error'

export class CloudSyncError extends Error {
  constructor(
    public readonly code: CloudSyncErrorCode,
    message: string,
    public readonly snapshot?: CloudSnapshot,
  ) {
    super(message)
    this.name = 'CloudSyncError'
  }
}

export interface CloudSyncClient {
  load(signal?: AbortSignal): Promise<CloudSnapshot>
  save(snapshot: CloudSnapshot, signal?: AbortSignal): Promise<CloudSnapshot>
}

type ClientOptions = {
  baseUrl: string
  password: string
  fetchImpl?: typeof fetch
}

export function createCloudSyncClient({ baseUrl, password, fetchImpl = fetch }: ClientOptions): CloudSyncClient {
  const endpoint = `${baseUrl.trim().replace(/\/+$/, '')}/records`
  const request = async (method: 'GET' | 'PUT', snapshot?: CloudSnapshot, signal?: AbortSignal): Promise<CloudSnapshot> => {
    let response: Response
    try {
      response = await fetchImpl(endpoint, {
        method,
        signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${password}`,
          ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
        },
        body: snapshot ? JSON.stringify(snapshot) : undefined,
      })
    } catch {
      throw new CloudSyncError('network', '无法连接云端，本地数据已保存')
    }

    const body = await readJson(response)
    if (!response.ok) throw mapError(response.status, body)
    const parsed = parseSnapshot(body)
    if (!parsed) throw new CloudSyncError('invalid_response', '云端返回了无法识别的数据')
    return parsed
  }

  return {
    load: (signal) => request('GET', undefined, signal),
    save: (snapshot, signal) => request('PUT', snapshot, signal),
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function mapError(status: number, body: unknown): CloudSyncError {
  const errorBody = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const message = typeof errorBody.message === 'string' ? errorBody.message : ''
  if (status === 401) return new CloudSyncError('unauthorized', message || '同步密码无效')
  if (status === 409) return new CloudSyncError('conflict', message || '云端数据已发生变化', parseSnapshot(errorBody.snapshot))
  if (status >= 500) return new CloudSyncError('server_error', '云端服务暂时不可用')
  return new CloudSyncError('invalid_response', message || '云端请求失败')
}

function parseSnapshot(value: unknown): CloudSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<CloudSnapshot>
  const data = normalizeEnvelope(candidate.data)
  if (!data || !(typeof candidate.sha === 'string' || candidate.sha === null)) return undefined
  return { sha: candidate.sha, data }
}
