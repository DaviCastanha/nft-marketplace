import type { User } from '@/shared/contracts/account'
import { db } from '@/mocks/db/store'
import type { SessionRecord, UserRecord } from '@/mocks/db/types'
import { fail } from '@/mocks/lib/http'
import { randomHex } from '@/mocks/lib/random'
import { currentScenario } from '@/mocks/scenarios/state'

const DEFAULT_SESSION_TTL_MS = 2 * 60 * 60 * 1000

export function toUser({ password: _password, createdAt: _createdAt, ...user }: UserRecord): User {
  return user
}

export function createSession(userId: string): SessionRecord {
  const ttl = currentScenario().sessionTtlMs ?? DEFAULT_SESSION_TTL_MS
  const session = { token: `tok_${randomHex(40)}`, userId, expiresAt: new Date(Date.now() + ttl).toISOString() }
  db().sessions.push(session)
  return session
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

/** Live session for a token, or null when unknown or expired. */
export function findSession(token: string | null): SessionRecord | null {
  if (!token) return null
  const session = db().sessions.find((s) => s.token === token)
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null
  return session
}

export function requireUser(request: Request): UserRecord {
  const token = bearerToken(request)
  if (!token) fail(401, 'UNAUTHORIZED', 'Entre na sua conta para continuar.')
  const session = findSession(token)
  if (!session) fail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  const user = db().users.find((u) => u.id === session.userId)
  if (!user) fail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  return user
}

/** Public routes accept anonymous calls, but a stale token is still reported as expired. */
export function optionalUser(request: Request): UserRecord | null {
  return bearerToken(request) ? requireUser(request) : null
}

export function userIdForToken(token: string | null): string | null {
  return findSession(token)?.userId ?? null
}
