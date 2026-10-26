import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { queryKeys } from '@/shared/api/query-keys'
import { rotateCartId } from '@/shared/lib/cart-id'
import { sessionStore } from '@/shared/session/session-store'

/** Path prefixes that require authentication (see the _auth layout route). */
const PRIVATE_PATHS =['/checkout', '/orders', '/account', '/favorites']

/**
 * Reacts to the end of a session: private cache is dropped (nothing leaks to the
 * next user), and an expiry on a private screen sends the user to login with a
 * redirect back, so the flow can resume.
 */
export function SessionLifecycle() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(
    () =>
      sessionStore.onEnd((reason) => {
        void queryClient.cancelQueries({ queryKey: queryKeys.user.all })
        queryClient.removeQueries({ queryKey: queryKeys.user.all })
        if (reason === 'logout') rotateCartId()

        const { pathname, href } = router.state.location
        if (reason === 'expired') {
          toast.warning('Sua sessão expirou. Entre novamente para continuar.', { id: 'session-expired' })
          if (PRIVATE_PATHS.some((p) => pathname.startsWith(p))) {
            void router.navigate({ to: '/login', search: { redirect: href, reason: 'expired' } })
          }
        }
        void router.invalidate()
      }),
    [queryClient, router],
  )

  return null
}
