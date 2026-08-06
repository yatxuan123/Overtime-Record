import { CloudSyncError, type CloudSyncClient, type CloudSnapshot } from './client'
import { mergeEnvelopes } from './data'
import type { SyncCache, SyncEnvelope, SyncRecord } from './types'

export type SyncStatus = 'disconnected' | 'syncing' | 'synced' | 'pending' | 'conflict' | 'unauthorized'

export type SyncState = {
  cache: SyncCache
  status: SyncStatus
  message: string
}

type ControllerOptions = {
  client?: CloudSyncClient
  initialCache: SyncCache
  persist: (cache: SyncCache) => void
  now?: () => string
}

export class SyncController {
  private state: SyncState
  private listeners = new Set<(state: SyncState) => void>()
  private syncPromise: Promise<void> | null = null
  private readonly now: () => string

  constructor(
    private readonly options: ControllerOptions,
  ) {
    this.now = options.now ?? (() => new Date().toISOString())
    this.state = {
      cache: options.initialCache,
      status: options.client ? (options.initialCache.isDirty ? 'pending' : 'synced') : 'disconnected',
      message: options.client ? '本地数据已加载' : '尚未连接云端',
    }
  }

  getState(): SyncState {
    return this.state
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async connect(): Promise<void> {
    const client = this.options.client
    if (!client) {
      this.update({ status: 'disconnected', message: '尚未连接云端' })
      return
    }
    this.update({ status: 'syncing', message: '正在读取云端数据' })
    try {
      const remote = await client.load()
      const merged = mergeEnvelopes(this.state.cache.envelope, remote.data)
      const isDirty = this.state.cache.isDirty || !sameEnvelope(merged, remote.data)
      this.replaceCache({ envelope: merged, sha: remote.sha, isDirty })
      if (isDirty) await this.requestSync()
      else this.update({ status: 'synced', message: '云端数据已同步' })
    } catch (error) {
      this.handleError(error)
    }
  }

  async replaceRecords(records: SyncRecord[]): Promise<void> {
    const updatedAt = this.now()
    const candidate: SyncEnvelope = {
      version: 1,
      updatedAt,
      records,
      tombstones: {},
    }
    const envelope = mergeEnvelopes(candidate, {
      version: 1,
      updatedAt: this.state.cache.envelope.updatedAt,
      records: [],
      tombstones: this.state.cache.envelope.tombstones,
    })
    this.replaceCache({ ...this.state.cache, envelope, isDirty: true })
    if (!this.options.client) {
      this.update({ status: 'disconnected', message: '本地已保存，连接云端后同步' })
      return
    }
    await this.requestSync()
  }

  async deleteRecord(id: string): Promise<void> {
    const deletedAt = this.now()
    const envelope: SyncEnvelope = {
      version: 1,
      updatedAt: deletedAt,
      records: this.state.cache.envelope.records.filter((record) => record.id !== id),
      tombstones: { ...this.state.cache.envelope.tombstones, [id]: deletedAt },
    }
    this.replaceCache({ ...this.state.cache, envelope, isDirty: true })
    if (!this.options.client) {
      this.update({ status: 'disconnected', message: '删除已保存在本地，连接云端后同步' })
      return
    }
    await this.requestSync()
  }

  async retry(): Promise<void> {
    if (!this.options.client) {
      this.update({ status: 'disconnected', message: '请先连接云端' })
      return
    }
    if (this.state.cache.isDirty) await this.requestSync()
    else await this.connect()
  }

  private requestSync(): Promise<void> {
    if (!this.syncPromise) {
      this.syncPromise = this.runSync().finally(() => { this.syncPromise = null })
    }
    return this.syncPromise
  }

  private async runSync(): Promise<void> {
    const client = this.options.client
    if (!client) return
    let conflictCount = 0

    while (this.state.cache.isDirty) {
      const pending: CloudSnapshot = { sha: this.state.cache.sha, data: this.state.cache.envelope }
      this.update({ status: 'syncing', message: '正在同步云端' })
      try {
        const saved = await client.save(pending)
        const changedDuringRequest = !sameEnvelope(this.state.cache.envelope, pending.data)
        this.replaceCache({
          envelope: changedDuringRequest ? this.state.cache.envelope : saved.data,
          sha: saved.sha,
          isDirty: changedDuringRequest,
        })
        conflictCount = 0
      } catch (error) {
        if (error instanceof CloudSyncError && error.code === 'conflict' && error.snapshot && conflictCount === 0) {
          conflictCount += 1
          this.replaceCache({
            envelope: mergeEnvelopes(this.state.cache.envelope, error.snapshot.data),
            sha: error.snapshot.sha,
            isDirty: true,
          })
          continue
        }
        this.handleError(error)
        return
      }
    }

    this.update({ status: 'synced', message: '云端数据已同步' })
  }

  private handleError(error: unknown): void {
    if (error instanceof CloudSyncError && error.code === 'unauthorized') {
      this.update({ status: 'unauthorized', message: '同步密码无效，本地数据仍已保存' })
      return
    }
    if (error instanceof CloudSyncError && error.code === 'conflict') {
      this.update({ status: 'conflict', message: '云端持续发生变化，请手动重试' })
      return
    }
    this.update({ status: 'pending', message: '暂时无法同步，本地数据已保存' })
  }

  private replaceCache(cache: SyncCache): void {
    this.state = { ...this.state, cache }
    this.options.persist(cache)
    this.emit()
  }

  private update(update: Partial<Omit<SyncState, 'cache'>>): void {
    this.state = { ...this.state, ...update }
    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state)
  }
}

function sameEnvelope(left: SyncEnvelope, right: SyncEnvelope): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
