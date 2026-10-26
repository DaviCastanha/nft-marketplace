import { useSyncExternalStore } from 'react'
import type { Session, User } from '@/shared/contracts/account'
import { local } from '@/shared/lib/storage'

const SESSION_KEY = 'kurio:session'

export type SessionState =
  | { status: 'anonymous' }
  | { status: 'authenticated'; token: string; expiresAt: string; user: User }

export type SessionEndReason = 'logout' | 'expired'

type Listener = () => void
type EndListener = (reason: SessionEndReason, previous: Extract<SessionState, { status: 'authenticated' }>) => void

function initialState(): SessionState {
  const saved = local.read<Session>(SESSION_KEY)
  return saved ? { status: 'authenticated', ...saved } : { status: 'anonymous' }
}

let state: SessionState = initialState()
const listeners = new Set<Listener>()
const endListeners = new Set<EndListener>()

function emit(next: SessionState) {
  state = next
  for (const listener of listeners) listener()
}

/**
 * Single source of truth for the client session. The token is persisted so the
 * session survives refresh; it is revalidated against the API on boot.
 */
export const sessionStore = {
  get: () => state,
  token: () => (state.status === 'authenticated' ? state.token : null),
  userId: () => (state.status === 'authenticated' ? state.user.id : null),
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** Notified once whenever an authenticated session ends (logout or expiry). */
  onEnd(listener: EndListener) {
    endListeners.add(listener)
    return () => {
      endListeners.delete(listener)
    }
  },
  start(session: Session) {
    local.write(SESSION_KEY, session)
    emit({ status: 'authenticated', ...session })
  },
  updateUser(user: User) {
    if (state.status !== 'authenticated') return
    const next = { ...state, user }
    local.write(SESSION_KEY, { token: next.token, expiresAt: next.expiresAt, user })
    emit(next)
  },
  end(reason: SessionEndReason) {
    if (state.status !== 'authenticated') return
    const previous = state
    local.remove(SESSION_KEY)
    emit({ status: 'anonymous' })
    for (const listener of endListeners) listener(reason, previous)
  },
}

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get)
}

export function useCurrentUser(): User | null {
  const session = useSession()
  return session.status === 'authenticated' ? session.user : null
}
