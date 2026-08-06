import { describe, expect, it } from 'vitest'
import { CloudSyncError, createCloudSyncClient } from './client'
import { emptyEnvelope } from './data'

const snapshot = { sha: 'abc', data: emptyEnvelope('2026-08-06T10:00:00.000Z') }

describe('cloud sync client', () => {
  it('loads records with authorization and a normalized URL', async () => {
    let request: Request | undefined
    const client = createCloudSyncClient({
      baseUrl: 'https://example.workers.dev/', password: 'secret',
      fetchImpl: async (input, init) => {
        request = new Request(input, init)
        return Response.json(snapshot)
      },
    })
    await expect(client.load()).resolves.toEqual(snapshot)
    expect(request?.url).toBe('https://example.workers.dev/records')
    expect(request?.headers.get('authorization')).toBe('Bearer secret')
  })

  it('saves the complete snapshot as JSON', async () => {
    let body = ''
    const client = createCloudSyncClient({
      baseUrl: 'https://example.workers.dev', password: 'secret',
      fetchImpl: async (input, init) => {
        body = await new Request(input, init).text()
        return Response.json({ ...snapshot, sha: 'next' })
      },
    })
    await client.save(snapshot)
    expect(JSON.parse(body)).toEqual(snapshot)
  })

  it('maps unauthorized responses to a typed error', async () => {
    const client = createCloudSyncClient({
      baseUrl: 'https://example.workers.dev', password: 'secret',
      fetchImpl: async () => Response.json({ error: 'unauthorized', message: '同步密码无效' }, { status: 401 }),
    })
    await expect(client.load()).rejects.toMatchObject({ code: 'unauthorized', message: '同步密码无效' })
  })

  it('includes the latest cloud snapshot in conflict errors', async () => {
    const latest = { ...snapshot, sha: 'latest' }
    const client = createCloudSyncClient({
      baseUrl: 'https://example.workers.dev', password: 'secret',
      fetchImpl: async () => Response.json({ error: 'conflict', message: '版本冲突', snapshot: latest }, { status: 409 }),
    })
    try {
      await client.save(snapshot)
      throw new Error('expected conflict')
    } catch (error) {
      expect(error).toBeInstanceOf(CloudSyncError)
      expect(error).toMatchObject({ code: 'conflict', snapshot: latest })
    }
  })

  it('returns a safe message for non-JSON upstream errors', async () => {
    const client = createCloudSyncClient({
      baseUrl: 'https://example.workers.dev', password: 'secret',
      fetchImpl: async () => new Response('Bad gateway', { status: 502 }),
    })
    await expect(client.load()).rejects.toMatchObject({ code: 'server_error', message: '云端服务暂时不可用' })
  })
})
