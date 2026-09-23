import { describe, expect, it } from 'vitest'
import { DEFAULT_REMOTE_URL, loadLocalRecords, loadRemoteRecords, loadRemoteRecordsSnapshot, pickFresherSnapshot, saveRemoteRecords } from './remote'
import type { OvertimeRecord } from './types'

const records: OvertimeRecord[] = [{ id: '1', date: '2026-08-08', tookTaxi: false, taxiCost: 0, taxiProvider: '', taxiProviderOther: '', note: '测试' }]

function encodeContent(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

describe('GitHub remote JSON storage', () => {
  it('loads the local data file on startup', async () => {
    let requestedUrl = ''
    const loaded = await loadLocalRecords('/Overtime-Record/data/overtime-records.json', async (input) => {
      requestedUrl = String(input)
      return Response.json(records)
    })
    expect(requestedUrl).toBe('/Overtime-Record/data/overtime-records.json')
    expect(loaded).toEqual([{ ...records[0], taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted' }])
  })

  it('loads public JSON only when explicitly requested', async () => {
    let requestedUrl = ''
    const loaded = await loadRemoteRecords(DEFAULT_REMOTE_URL, async (input) => {
      requestedUrl = String(input)
      return Response.json(records)
    })
    const parsedUrl = new URL(requestedUrl)
    expect(`${parsedUrl.origin}${parsedUrl.pathname}`).toBe(DEFAULT_REMOTE_URL)
    const cacheBust = parsedUrl.searchParams.get('v')
    expect(cacheBust).not.toBeNull()
    expect(cacheBust).toMatch(/^\d+$/)
    expect(loaded).toEqual([{ ...records[0], taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted' }])
  })

  it('reads the version from the remote JSON envelope', async () => {
    const snapshot = await loadRemoteRecordsSnapshot(DEFAULT_REMOTE_URL, async () => Response.json({ version: 7, records }))
    expect(snapshot).toEqual({ version: 7, records: [{ ...records[0], taxiProvider: '', taxiProviderOther: '', reimbursementStatus: 'unsubmitted' }] })
  })

  it('reads the current file SHA and commits JSON through GitHub Contents API', async () => {
    const requests: Request[] = []
    const result = await saveRemoteRecords(records, 'token', async (input, init) => {
      requests.push(new Request(input, init))
      if (requests.length === 1) return Response.json({ sha: 'current-sha', content: '' })
      return Response.json({ content: { sha: 'new-sha' } })
    })
    expect(result).toEqual({ sha: 'new-sha', version: 2 })
    expect(requests[0].url).toContain('/contents/data/overtime-records.json')
    expect(requests[1].method).toBe('PUT')
    expect(requests[1].headers.get('authorization')).toBe('Bearer token')
    const body = JSON.parse(await requests[1].text())
    expect(body.sha).toBe('current-sha')
    expect(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.content), (character) => character.charCodeAt(0))))).toEqual({ version: 2, records })
  })

  it('rejects a save when the remote version changed after the last load', async () => {
    const remoteData = JSON.stringify({ version: 4, records })
    await expect(saveRemoteRecords(records, 'token', async () => Response.json({ sha: 'current-sha', content: encodeContent(remoteData) }), DEFAULT_REMOTE_URL, 3)).rejects.toThrow('GitHub 数据版本冲突')
  })

  it('fails closed when the current GitHub JSON cannot be decoded', async () => {
    await expect(saveRemoteRecords(records, 'token', async () => Response.json({ sha: 'current-sha', content: encodeContent('{bad json') }))).rejects.toThrow('GitHub 数据版本号无效')
  })

  it('surfaces GitHub authorization errors without storing the token', async () => {
    await expect(saveRemoteRecords(records, 'token', async () => Response.json({ message: 'Bad credentials' }, { status: 401 }))).rejects.toThrow('GitHub Token 无效')
  })

  it('includes GitHub permission details for forbidden saves', async () => {
    await expect(saveRemoteRecords(records, 'token', async () => Response.json({ message: 'Resource not accessible by personal access token' }, { status: 403 }))).rejects.toThrow('GitHub 拒绝写入：Resource not accessible by personal access token')
  })
})

describe('pickFresherSnapshot', () => {
  const snapshot = (version: number) => ({ records, version })

  it('takes the remote snapshot when it is newer', () => {
    const remote = { records: [{ ...records[0], id: 'remote' }], version: 7 }
    expect(pickFresherSnapshot(snapshot(5), remote)).toBe(remote)
  })

  it('keeps the local snapshot when both sides are on the same version', () => {
    const local = snapshot(5)
    expect(pickFresherSnapshot(local, snapshot(5))).toBe(local)
  })

  it('keeps the local snapshot when the remote file is missing', () => {
    // loadRemoteRecordsSnapshot 对 404 返回空数据而不是抛错，这里必须挡住，
    // 否则启动时会显示空列表并把浏览器缓存清掉。
    const local = snapshot(5)
    expect(pickFresherSnapshot(local, { records: [], version: 0 })).toBe(local)
  })

  it('takes the remote snapshot when the local snapshot could not be read', () => {
    const remote = snapshot(5)
    expect(pickFresherSnapshot({ records: [], version: 0 }, remote)).toBe(remote)
  })

  it('keeps the local snapshot when it is ahead of a stale remote file', () => {
    const local = snapshot(7)
    expect(pickFresherSnapshot(local, snapshot(5))).toBe(local)
  })
})
