import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from '@/features/auth/api'
import { sessionStore } from '@/shared/session/session-store'

/** Ends the session locally even if the API call fails: the user asked to leave. */
export function useLogout() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => {
      sessionStore.end('logout')
      void navigate({ to: '/' })
    },
  })
}
