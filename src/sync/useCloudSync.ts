import { useCallback, useEffect, useRef, useState } from 'react'
import { createCloudSyncClient } from './client'
import { SyncController, type SyncState, type SyncStatus } from './controller'
import { loadSessionPassword, loadSyncCache, loadWorkerUrl, saveSessionPassword, saveSyncCache, saveWorkerUrl } from '../storage'
import type { OvertimeRecord } from '../types'
import type { SyncRecord } from './types'

type FactoryOptions = {
  localStorage: Storage
  sessionStorage: Storage
  workerUrl?: string
  password?: string
  now?: () => string
  fetchImpl?: typeof fetch
}

export function createSyncController(options: FactoryOptions): SyncController {
  const now = options.now ?? (() => new Date().toISOString())
  const workerUrl = options.workerUrl ?? loadWorkerUrl(options.localStorage)
  const password = options.password ?? loadSessionPassword(options.sessionStorage)
  const initialCache = loadSyncCache(options.localStorage, now())
  const client = workerUrl && password ? createCloudSyncClient({ baseUrl: workerUrl, password, fetchImpl: options.fetchImpl }) : undefined
  return new SyncController({
    client,
    initialCache,
    now,
    persist: (cache) => saveSyncCache(options.localStorage, cache),
  })
}

export function markChangedRecords(records: OvertimeRecord[], previous: SyncRecord[], updatedAt: string): SyncRecord[] {
  return records.map((record) => {
    const prior = previous.find((item) => item.id === record.id)
    if (prior && sameRecordContent(prior, record)) return { ...record, updatedAt: prior.updatedAt }
    return { ...record, updatedAt }
  })
}

export type CloudSyncView = {
  records: SyncRecord[]
  status: SyncStatus
  message: string
  workerUrl: string
  isPasswordConfigured: boolean
  connect: (workerUrl: string, password: string) => Promise<void>
  disconnect: () => void
  syncNow: () => Promise<void>
  replaceRecords: (records: OvertimeRecord[]) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
}

export function useCloudSync(): CloudSyncView {
  const localStorageRef = window.localStorage
  const sessionStorageRef = window.sessionStorage
  const controllerRef = useRef<SyncController | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const [workerUrl, setWorkerUrl] = useState(() => loadWorkerUrl(localStorageRef))
  const [isPasswordConfigured, setPasswordConfigured] = useState(() => Boolean(loadSessionPassword(sessionStorageRef)))
  const [state, setState] = useState<SyncState>(() => {
    const controller = createSyncController({ localStorage: localStorageRef, sessionStorage: sessionStorageRef })
    controllerRef.current = controller
    return controller.getState()
  })

  const bindController = useCallback((controller: SyncController, shouldConnect: boolean) => {
    unsubscribeRef.current?.()
    controllerRef.current = controller
    unsubscribeRef.current = controller.subscribe((next) => setState({ ...next, cache: { ...next.cache, envelope: { ...next.cache.envelope, records: [...next.cache.envelope.records] } } }))
    setState(controller.getState())
    if (shouldConnect) void controller.connect()
  }, [])

  useEffect(() => {
    const current = controllerRef.current
    if (!current) return undefined
    bindController(current, Boolean(workerUrl && isPasswordConfigured))
    const onOnline = () => void controllerRef.current?.retry()
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('online', onOnline)
      unsubscribeRef.current?.()
    }
  }, [bindController, isPasswordConfigured, workerUrl])

  const connect = useCallback(async (nextUrl: string, password: string) => {
    saveWorkerUrl(localStorageRef, nextUrl)
    saveSessionPassword(sessionStorageRef, password)
    setWorkerUrl(loadWorkerUrl(localStorageRef))
    setPasswordConfigured(Boolean(password))
    const controller = createSyncController({ localStorage: localStorageRef, sessionStorage: sessionStorageRef, workerUrl: nextUrl, password })
    bindController(controller, false)
    await controller.connect()
  }, [bindController, localStorageRef, sessionStorageRef])

  const disconnect = useCallback(() => {
    saveSessionPassword(sessionStorageRef, '')
    setPasswordConfigured(false)
    const controller = createSyncController({ localStorage: localStorageRef, sessionStorage: sessionStorageRef, workerUrl })
    bindController(controller, false)
  }, [bindController, localStorageRef, sessionStorageRef, workerUrl])

  const replaceRecords = useCallback(async (records: OvertimeRecord[]) => {
    const controller = controllerRef.current
    if (!controller) return
    const updatedAt = new Date().toISOString()
    await controller.replaceRecords(markChangedRecords(records, controller.getState().cache.envelope.records, updatedAt))
  }, [])

  return {
    records: state.cache.envelope.records,
    status: state.status,
    message: state.message,
    workerUrl,
    isPasswordConfigured,
    connect,
    disconnect,
    syncNow: () => controllerRef.current?.retry() ?? Promise.resolve(),
    replaceRecords,
    deleteRecord: (id) => controllerRef.current?.deleteRecord(id) ?? Promise.resolve(),
  }
}

function sameRecordContent(left: OvertimeRecord, right: OvertimeRecord): boolean {
  return left.id === right.id && left.date === right.date && left.leaveTime === right.leaveTime && left.hours === right.hours && left.tookTaxi === right.tookTaxi && left.taxiCost === right.taxiCost && left.note === right.note
}
