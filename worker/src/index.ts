import { emptyEnvelope, normalizeEnvelope } from '../../src/sync/data'
import type { SyncEnvelope } from '../../src/sync/types'

export type Env = {
  GITHUB_TOKEN: string
  SYNC_PASSWORD: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  GITHUB_BRANCH: string
  DATA_PATH: string
  ALLOWED_ORIGIN: string
}

type GitHubFile = { sha: string; content?: string; encoding?: string }
type FetchLike = typeof fetch

const MAX_BODY_BYTES = 256 * 1024

export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env),
}

export async function handleRequest(request: Request, env: Env, fetchImpl: FetchLike = fetch): Promise<Response> {
  const origin = request.headers.get('Origin')
  const corsHeaders = new Headers({
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    Vary: 'Origin',
  })

  if (origin && origin !== env.ALLOWED_ORIGIN) return json({ error: 'forbidden', message: '来源不被允许' }, 403, corsHeaders)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'GET' && request.method !== 'PUT') return json({ error: 'method_not_allowed', message: '不支持的请求方法' }, 405, corsHeaders)
  if (!constantTimeEquals(request.headers.get('Authorization') ?? '', `Bearer ${env.SYNC_PASSWORD}`)) return json({ error: 'unauthorized', message: '同步密码无效' }, 401, corsHeaders)

  const githubUrl = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${env.DATA_PATH}`
  const current = await readGitHubFile(githubUrl, env, fetchImpl)
  if (current.error) return json({ error: 'server_error', message: '云端服务暂时不可用' }, 502, corsHeaders)
  if (request.method === 'GET') return json({ sha: current.sha, data: current.data }, 200, corsHeaders)

  const contentLength = Number(request.headers.get('Content-Length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) return json({ error: 'payload_too_large', message: '同步数据过大' }, 413, corsHeaders)
  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json({ error: 'payload_too_large', message: '同步数据过大' }, 413, corsHeaders)

  let payload: unknown
  try { payload = JSON.parse(rawBody) } catch { return json({ error: 'invalid_data', message: '请求数据不是有效 JSON' }, 400, corsHeaders) }
  if (!isPayload(payload)) return json({ error: 'invalid_data', message: '请求数据格式无效' }, 400, corsHeaders)
  if (payload.sha !== current.sha) return json({ error: 'conflict', message: '云端数据已发生变化', snapshot: { sha: current.sha, data: current.data } }, 409, corsHeaders)

  const encoded = encodeBase64(JSON.stringify(payload.data))
  const githubResponse = await fetchImpl(githubUrl, {
    method: 'PUT',
    headers: githubHeaders(env),
    body: JSON.stringify({ message: 'chore(data): 同步加班记录', content: encoded, branch: env.GITHUB_BRANCH, ...(current.sha ? { sha: current.sha } : {}) }),
  })
  if (!githubResponse.ok) return json({ error: 'server_error', message: '云端服务暂时不可用' }, 502, corsHeaders)
  const saved = await readJson(githubResponse)
  const savedContent = saved && typeof saved === 'object' ? (saved as { content?: unknown }).content : undefined
  const newSha = savedContent && typeof savedContent === 'object' && typeof (savedContent as { sha?: unknown }).sha === 'string' ? (savedContent as { sha: string }).sha : undefined
  if (!newSha) return json({ error: 'server_error', message: '云端返回了无法识别的数据' }, 502, corsHeaders)
  return json({ sha: newSha, data: payload.data }, 200, corsHeaders)
}

async function readGitHubFile(url: string, env: Env, fetchImpl: FetchLike): Promise<{ sha: string | null; data: SyncEnvelope; error?: boolean }> {
  const response = await fetchImpl(url, { headers: githubHeaders(env) })
  if (response.status === 404) return { sha: null, data: emptyEnvelope(new Date().toISOString()) }
  if (!response.ok) return { sha: null, data: emptyEnvelope(new Date().toISOString()), error: true }
  const body = await readJson(response)
  if (!isGitHubFile(body) || !body.content) return { sha: null, data: emptyEnvelope(new Date().toISOString()), error: true }
  try {
    const parsed = normalizeEnvelope(JSON.parse(decodeBase64(body.content)))
    if (!parsed) return { sha: null, data: emptyEnvelope(new Date().toISOString()), error: true }
    return { sha: body.sha, data: parsed }
  } catch {
    return { sha: null, data: emptyEnvelope(new Date().toISOString()), error: true }
  }
}

function githubHeaders(env: Env): HeadersInit {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function isPayload(value: unknown): value is { sha: string | null; data: SyncEnvelope } {
  if (!value || typeof value !== 'object') return false
  const payload = value as { sha?: unknown; data?: unknown }
  return (typeof payload.sha === 'string' || payload.sha === null) && Boolean(normalizeEnvelope(payload.data))
}

function isGitHubFile(value: unknown): value is GitHubFile {
  if (!value || typeof value !== 'object') return false
  const file = value as Partial<GitHubFile>
  return typeof file.sha === 'string' && (file.content === undefined || typeof file.content === 'string') && (file.encoding === undefined || typeof file.encoding === 'string')
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json() } catch { return null }
}

function json(value: unknown, status: number, headers: Headers): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(value), { status, headers: responseHeaders })
}

function constantTimeEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let result = 0
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return result === 0
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
