import { authApi } from '@/features/auth/api'
import { ApiError } from '@/shared/api/errors'
import { sessionStore } from '@/shared/session/session-store'

let restored: Promise<void> | null = null

/**
 * Revalidates the persisted token once per page load. A 401 ends the session
 * (via the HTTP interceptor); transient failures keep it so offline refreshes do not log out.
 */
export function restoreSession(): Promise<void> {
  restored ??= (async () => {
    if (!sessionStore.token()) return
    try {
      sessionStore.start(await authApi.session())
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) sessionStore.end('expired')
    }
  })()
  return restored
}
