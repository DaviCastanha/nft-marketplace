import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthDialog } from '@/features/auth/auth-dialog'
import { authSearchSchema } from '@/features/auth/search'
import { sessionStore } from '@/shared/session/session-store'

export const Route = createFileRoute('/signup')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    if (sessionStore.token()) throw redirect({ href: search.redirect ?? '/', replace: true })
  },
  head: () => ({ meta: [{ title: 'Criar conta — Kurio' }] }),
  component: SignupRoute,
})

function SignupRoute() {
  return <AuthDialog mode="signup" search={Route.useSearch()} />
}
