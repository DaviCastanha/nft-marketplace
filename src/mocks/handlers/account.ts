import { HttpResponse, delay } from 'msw'
import {
  avatarInputSchema,
  passwordChangeInputSchema,
  profileInputSchema,
  walletInputSchema,
  walletSessionInputSchema,
  walletSlotSchema,
  type Wallet,
  type WalletSession,
} from '@/shared/contracts/account'
import { requireUser, toUser } from '@/mocks/domain/auth'
import { db } from '@/mocks/db/store'
import { fail, noContent, parseBody } from '@/mocks/lib/http'
import { hashPassword, verifyPassword } from '@/mocks/lib/password'
import { randomId } from '@/mocks/lib/random'
import { param, route } from '@/mocks/lib/route'
import { currentScenario } from '@/mocks/scenarios/state'

/** Time the simulated wallet extension takes to show and answer the approval prompt. */
const WALLET_PROMPT_MS = 700

export const accountHandlers = [
  route('get', '/profile', 'profile.get', ({ request }) => HttpResponse.json(toUser(requireUser(request)))),

  route('put', '/profile', 'profile.update', async ({ request }) => {
    const user = requireUser(request)
    const input = await parseBody(request, profileInputSchema)
    const others = db().users.filter((u) => u.id !== user.id)
    if (others.some((u) => u.email === input.email)) {
      fail(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', { fields: { email: 'Este e-mail já está em uso por outra conta.' } })
    }
    if (others.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) {
      fail(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { fields: { username: 'Este nome de usuário já está em uso.' } })
    }
    Object.assign(user, input)
    return HttpResponse.json(toUser(user))
  }),

  route('post', '/profile/avatar', 'profile.avatar', async ({ request }) => {
    const user = requireUser(request)
    const { dataUrl } = await parseBody(request, avatarInputSchema)
    user.avatarUrl = dataUrl
    return HttpResponse.json(toUser(user))
  }),

  route('delete', '/profile/avatar', 'profile.avatar', ({ request }) => {
    const user = requireUser(request)
    user.avatarUrl = null
    return HttpResponse.json(toUser(user))
  }),

  route('post', '/profile/password', 'profile.password', async ({ request }) => {
    const user = requireUser(request)
    const input = await parseBody(request, passwordChangeInputSchema)
    if (!(await verifyPassword(input.currentPassword, user.password))) {
      fail(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', { fields: { currentPassword: 'Senha atual incorreta.' } })
    }
    user.password = await hashPassword(input.newPassword)
    return noContent()
  }),

  route('get', '/wallets', 'wallets.get', ({ request }) => {
    const user = requireUser(request)
    return HttpResponse.json(db().wallets[user.id] ?? { primary: null, secondary: null })
  }),

  route('put', '/wallets/:slot', 'wallets.update', async ({ request, params }) => {
    const user = requireUser(request)
    const slot = walletSlotSchema.safeParse(param(params, 'slot'))
    if (!slot.success) fail(404, 'NOT_FOUND', 'Tipo de carteira inexistente.')
    const input = await parseBody(request, walletInputSchema)
    const wallets = (db().wallets[user.id] ??= { primary: null, secondary: null })
    if (slot.data === 'secondary' && !wallets.primary) {
      fail(409, 'CONFLICT', 'Cadastre a carteira principal antes da secundária.')
    }
    const other = slot.data === 'primary' ? wallets.secondary : wallets.primary
    if (other && other.address.toLowerCase() === input.address.toLowerCase() && slot.data === 'primary') {
      fail(409, 'CONFLICT', 'Este endereço já está cadastrado como carteira secundária.', {
        fields: { address: 'Este endereço já está cadastrado como carteira secundária.' },
      })
    }
    const wallet: Wallet = {
      ...input,
      id: wallets[slot.data]?.id ?? randomId('wal'),
      slot: slot.data,
      updatedAt: new Date().toISOString(),
    }
    wallets[slot.data] = wallet
    return HttpResponse.json(wallets)
  }),

  /** Simulated wallet connection: the "extension" approves or rejects after a short prompt. */
  route('post', '/wallet-sessions', 'wallets.session', async ({ request }) => {
    const user = requireUser(request)
    const input = await parseBody(request, walletSessionInputSchema)
    const wallets = db().wallets[user.id]
    const wallet = [wallets?.primary, wallets?.secondary].find((w) => w?.id === input.walletId)
    if (!wallet) fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
    await delay(WALLET_PROMPT_MS)
    if (currentScenario().walletRejects) fail(409, 'WALLET_REJECTED', 'A conexão foi recusada na carteira.')
    const session: WalletSession = {
      id: randomId('wss'),
      walletId: wallet.id,
      provider: wallet.provider,
      network: input.network,
      address: wallet.address,
      connectedAt: new Date().toISOString(),
    }
    db().walletSessions[session.id] = { ...session, userId: user.id, active: true }
    return HttpResponse.json(session, { status: 201 })
  }),

  route('delete', '/wallet-sessions/:id', 'wallets.session', ({ request, params }) => {
    const user = requireUser(request)
    const session = db().walletSessions[param(params, 'id')]
    if (session && session.userId === user.id) session.active = false
    return noContent()
  }),
]
