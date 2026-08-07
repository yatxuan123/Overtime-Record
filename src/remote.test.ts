import { describe, expect, it } from 'vitest'
import { DEFAULT_REMOTE_URL, loadRemoteRecords, saveRemoteRecords } from './remote'
import type { OvertimeRecord } from './types'

const records: OvertimeRecord[] = [{ id: '1', date: '2026-08-08', tookTaxi: false, taxiCost: 0, taxiProvider: '', taxiProviderOther: '', note: '测试' }]

describe('GitHub remote JSON storage', () => {
  it('loads public JSON only when explicitly requested', async () => {
    let requestedUrl = ''
    const loaded = await loadRemoteRecords(DEFAULT_REMOTE_URL, async (input) => {
      requestedUrl = String(input)
      return Response.json(records)
    })
    expect(requestedUrl).toBe(DEFAULT_REMOTE_URL)
    expect(loaded).toEqual(records)
  })

  it('reads the current file SHA and commits JSON through GitHub Contents API', async () => {
    const requests: Request[] = []
    const result = await saveRemoteRecords(records, 'token', async (input, init) => {
      requests.push(new Request(input, init))
      if (requests.length === 1) return Response.json({ sha: 'current-sha', content: '' })
      return Response.json({ content: { sha: 'new-sha' } })
    })
    expect(result).toBe('new-sha')
    expect(requests[0].url).toContain('/contents/data/overtime-records.json')
    expect(requests[1].method).toBe('PUT')
    expect(requests[1].headers.get('authorization')).toBe('Bearer token')
    expect(JSON.parse(await requests[1].text()).sha).toBe('current-sha')
  })

  it('surfaces GitHub authorization errors without storing the token', async () => {
    await expect(saveRemoteRecords(records, 'token', async () => Response.json({ message: 'Bad credentials' }, { status: 401 }))).rejects.toThrow('GitHub Token 无效')
  })

  it('includes GitHub permission details for forbidden saves', async () => {
    await expect(saveRemoteRecords(records, 'token', async () => Response.json({ message: 'Resource not accessible by personal access token' }, { status: 403 }))).rejects.toThrow('GitHub 拒绝写入：Resource not accessible by personal access token')
  })
})
