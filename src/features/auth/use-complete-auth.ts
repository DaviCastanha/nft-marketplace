import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { authApi } from '@/features/auth/api'
import { cartQueryKey } from '@/features/cart/api'
import { announce } from '@/shared/a11y/announcer'
import { queryKeys } from '@/shared/api/query-keys'
import type { Session } from '@/shared/contracts/account'
import { sessionStore } from '@/shared/session/session-store'

/**
 * Finishes login/signup: starts the session, moves the visitor cart into the
 * user's cart on the API, and returns to where the user was (e.g. the checkout).
 */
export function useCompleteAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return async (session: Session, redirect: string | undefined) => {
    const guestCartKey = cartQueryKey(null)
    sessionStore.start(session)
    try {
      queryClient.setQueryData(queryKeys.user.cart(session.user.id), await authApi.mergeCart())
    } catch {
      // The user cart query refetches on its own; merging is retried on the next login.
    }
    queryClient.removeQueries({ queryKey: guestCartKey })
    announce(`Você entrou como ${session.user.displayName}.`)
    await router.navigate({ href: redirect ?? '/', replace: true })
  }
}
