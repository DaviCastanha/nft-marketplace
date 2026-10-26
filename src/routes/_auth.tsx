import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { sessionStore } from '@/shared/session/session-store'

/** Guard for every private screen: without a session, go to login and come back afterwards. */
export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.token()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: Outlet,
})
