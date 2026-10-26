import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthDialog } from '@/features/auth/auth-dialog'
import { authSearchSchema } from '@/features/auth/search'
import { sessionStore } from '@/shared/session/session-store'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  // Already signed in: go straight to the destination.
  beforeLoad: ({ search }) => {
    if (sessionStore.token()) throw redirect({ href: search.redirect ?? '/', replace: true })
  },
  head: () => ({ meta: [{ title: 'Entrar — Kurio' }] }),
  component: LoginRoute,
})

function LoginRoute() {
  return <AuthDialog mode="login" search={Route.useSearch()} />
}
