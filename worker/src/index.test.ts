import { describe, expect, it } from 'vitest'
import { handleRequest, type Env } from './index'
import { emptyEnvelope } from '../../src/sync/data'

const now = '2026-08-06T10:00:00.000Z'
const env: Env = {
  GITHUB_TOKEN: 'github-secret', SYNC_PASSWORD: 'sync-secret', GITHUB_OWNER: 'yatxuan123',
  GITHUB_REPO: 'Overtime-Record-Data', GITHUB_BRANCH: 'main', DATA_PATH: 'data/overtime-records.json',
  ALLOWED_ORIGIN: 'https://yatxuan123.github.io',
}

function request(method = 'GET', body?: unknown, origin = env.ALLOWED_ORIGIN, password = env.SYNC_PASSWORD) {
  return new Request('https://worker.example/records', {
    method,
    headers: { Origin: origin, Authorization: `Bearer ${password}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function githubFetch() {
  let file: { sha: string; data: unknown } | undefined
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (method === 'GET') {
      if (!file) return new Response('not found', { status: 404 })
      const content = encodeBase64(JSON.stringify(file.data))
      return Response.json({ sha: file.sha, encoding: 'base64', content })
    }
    const body = JSON.parse(String(init?.body)) as { content: string; sha?: string }
    if (file && body.sha !== file.sha) return Response.json({ message: 'sha mismatch' }, { status: 409 })
    file = { sha: `sha-${(file?.sha ?? '0').length + 1}`, data: JSON.parse(decodeBase64(body.content)) }
    return Response.json({ content: { sha: file.sha } })
  }
}

describe('Cloudflare Worker records API', () => {
  it('handles CORS preflight', async () => {
    const response = await handleRequest(new Request('https://worker.example/records', { method: 'OPTIONS', headers: { Origin: env.ALLOWED_ORIGIN } }), env, githubFetch())
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(env.ALLOWED_ORIGIN)
  })

  it('rejects a wrong origin and password', async () => {
    expect((await handleRequest(request('GET', undefined, 'https://evil.example'), env, githubFetch())).status).toBe(403)
    expect((await handleRequest(request('GET', undefined, env.ALLOWED_ORIGIN, 'bad'), env, githubFetch())).status).toBe(401)
  })

  it('returns an empty snapshot when the GitHub file does not exist', async () => {
    const response = await handleRequest(request(), env, githubFetch())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ sha: null, data: emptyEnvelope(expect.any(String) as unknown as string) })
  })

  it('creates and then reads a GitHub file', async () => {
    const fetchImpl = githubFetch()
    const data = emptyEnvelope(now)
    const created = await handleRequest(request('PUT', { sha: null, data }), env, fetchImpl)
    expect(created.status).toBe(200)
    const read = await handleRequest(request(), env, fetchImpl)
    expect((await read.json()).data).toEqual(data)
  })

  it('rejects stale SHA with a conflict response', async () => {
    const fetchImpl = githubFetch()
    const data = emptyEnvelope(now)
    await handleRequest(request('PUT', { sha: null, data }), env, fetchImpl)
    const response = await handleRequest(request('PUT', { sha: 'stale', data }), env, fetchImpl)
    expect(response.status).toBe(409)
    expect((await response.json()).error).toBe('conflict')
  })

  it('rejects an oversized body', async () => {
    const response = await handleRequest(request('PUT', { sha: null, data: { ...emptyEnvelope(now), updatedAt: 'x'.repeat(300_000) } }), env, githubFetch())
    expect(response.status).toBe(413)
  })
})

function encodeBase64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
}

function decodeBase64(value: string): string {
  return decodeURIComponent(escape(atob(value.replace(/\s/g, ''))))
}
