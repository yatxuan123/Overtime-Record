import type { SyncEnvelope, SyncRecord } from './types'

export function emptyEnvelope(updatedAt: string): SyncEnvelope {
  return { version: 1, updatedAt, records: [], tombstones: {} }
}

export function normalizeEnvelope(value: unknown): SyncEnvelope | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<SyncEnvelope>
  if (candidate.version !== 1 || !isTimestamp(candidate.updatedAt) || !Array.isArray(candidate.records) || !isTombstones(candidate.tombstones)) return null
  const records = candidate.records.filter(isSyncRecord)
  if (records.length !== candidate.records.length) return null
  return {
    version: 1,
    updatedAt: candidate.updatedAt,
    records: sortRecords(records),
    tombstones: { ...candidate.tombstones },
  }
}

export function mergeEnvelopes(local: SyncEnvelope, remote: SyncEnvelope): SyncEnvelope {
  const records = new Map<string, SyncRecord>()
  const tombstones: Record<string, string> = {}

  for (const item of [...local.records, ...remote.records]) {
    const current = records.get(item.id)
    if (!current || item.updatedAt > current.updatedAt) records.set(item.id, item)
  }

  for (const source of [local.tombstones, remote.tombstones]) {
    for (const [id, deletedAt] of Object.entries(source)) {
      if (!tombstones[id] || deletedAt > tombstones[id]) tombstones[id] = deletedAt
    }
  }

  for (const [id, deletedAt] of Object.entries(tombstones)) {
    const item = records.get(id)
    if (!item || deletedAt >= item.updatedAt) records.delete(id)
    else delete tombstones[id]
  }

  const timestamps = [
    local.updatedAt,
    remote.updatedAt,
    ...Array.from(records.values(), (item) => item.updatedAt),
    ...Object.values(tombstones),
  ]

  const sortedTimestamps = timestamps.sort()

  return {
    version: 1,
    updatedAt: sortedTimestamps[sortedTimestamps.length - 1] ?? local.updatedAt,
    records: sortRecords([...records.values()]),
    tombstones,
  }
}

function sortRecords(records: SyncRecord[]): SyncRecord[] {
  return [...records].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isTombstones(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.values(value as Record<string, unknown>).every(isTimestamp)
}

function isSyncRecord(value: unknown): value is SyncRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<SyncRecord>
  return (
    typeof record.id === 'string' &&
    typeof record.date === 'string' &&
    typeof record.tookTaxi === 'boolean' &&
    typeof record.taxiCost === 'number' &&
    typeof record.note === 'string' &&
    (typeof record.taxiProvider === 'undefined' || typeof record.taxiProvider === 'string') &&
    (typeof record.taxiProviderOther === 'undefined' || typeof record.taxiProviderOther === 'string') &&
    (typeof record.reimbursementStatus === 'undefined' || record.reimbursementStatus === 'unsubmitted' || record.reimbursementStatus === 'submitted' || record.reimbursementStatus === 'paid') &&
    isTimestamp(record.updatedAt)
  )
}
