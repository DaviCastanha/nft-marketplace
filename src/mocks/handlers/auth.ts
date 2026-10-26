import { HttpResponse } from 'msw'
import { loginInputSchema, signupInputSchema, type Session } from '@/shared/contracts/account'
import { bearerToken, createSession, requireUser, toUser } from '@/mocks/domain/auth'
import { db } from '@/mocks/db/store'
import type { UserRecord } from '@/mocks/db/types'
import { fail, noContent, parseBody } from '@/mocks/lib/http'
import { hashPassword, verifyPassword } from '@/mocks/lib/password'
import { randomId } from '@/mocks/lib/random'
import { route } from '@/mocks/lib/route'

function sessionResponse(user: UserRecord, status = 200) {
  const session = createSession(user.id)
  const body: Session = { token: session.token, expiresAt: session.expiresAt, user: toUser(user) }
  return HttpResponse.json(body, { status })
}

export const authHandlers = [
  route('post', '/auth/signup', 'auth.signup', async ({ request }) => {
    const input = await parseBody(request, signupInputSchema)
    const users = db().users
    if (users.some((u) => u.email === input.email)) {
      fail(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { fields: { email: 'Este e-mail já está cadastrado. Tente entrar.' } })
    }
    if (users.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) {
      fail(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { fields: { username: 'Este nome de usuário já está em uso.' } })
    }
    const user: UserRecord = {
      id: randomId('usr'),
      email: input.email,
      username: input.username,
      displayName: input.username,
      ensName: input.username.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      ensSuffix: '.eth',
      walletNickname: 'Minha carteira',
      avatarUrl: null,
      password: await hashPassword(input.password),
      createdAt: new Date().toISOString(),
    }
    users.push(user)
    db().wallets[user.id] = { primary: null, secondary: null }
    db().favorites[user.id] = []
    return sessionResponse(user, 201)
  }),

  route('post', '/auth/login', 'auth.login', async ({ request }) => {
    const input = await parseBody(request, loginInputSchema)
    const user = db().users.find((u) => u.email === input.email)
    if (!user || !(await verifyPassword(input.password, user.password))) {
      fail(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }
    return sessionResponse(user)
  }),

  route('get', '/auth/session', 'auth.session', ({ request }) => {
    const user = requireUser(request)
    const session = db().sessions.find((s) => s.token === bearerToken(request))!
    const body: Session = { token: session.token, expiresAt: session.expiresAt, user: toUser(user) }
    return HttpResponse.json(body)
  }),

  route('post', '/auth/logout', 'auth.logout', ({ request }) => {
    const token = bearerToken(request)
    db().sessions = db().sessions.filter((s) => s.token !== token)
    return noContent()
  }),
]
