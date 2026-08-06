import type { OvertimeRecord } from '../types'

export type SyncRecord = OvertimeRecord & {
  updatedAt: string
}

export type SyncEnvelope = {
  version: 1
  updatedAt: string
  records: SyncRecord[]
  tombstones: Record<string, string>
}

export type SyncCache = {
  envelope: SyncEnvelope
  sha: string | null
  isDirty: boolean
}
