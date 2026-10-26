import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Link, Outlet, createRootRouteWithContext, useLocation } from '@tanstack/react-router'
import { MobileNav } from '@/app/layout/mobile-nav'
import { SiteFooter } from '@/app/layout/site-footer'
import { SiteHeader } from '@/app/layout/site-header'
import { SessionLifecycle } from '@/app/session-lifecycle'
import { restoreSession } from '@/features/auth/restore-session'
import { LiveAnnouncer } from '@/shared/a11y/live-announcer'
import { Toaster } from '@/shared/components/ui/sonner'
import { cn } from '@/shared/lib/utils'

export interface RouterContext {
  queryClient: QueryClient
}

/** Screens with their own mobile action bars (no bottom navigation on small screens). */
const FOCUSED_MOBILE_SCREENS = ['/nfts/', '/cart', '/checkout', '/login', '/signup']

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: () => restoreSession(),
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const { pathname } = useLocation()
  const focused = FOCUSED_MOBILE_SCREENS.some((p) => pathname.startsWith(p))

  return (
    <>
      <HeadContent />
      <a href="#main" className="skip-link">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className={cn('outline-none', !focused && 'pb-28 lg:pb-0')}>
        <Outlet />
      </main>
      <SiteFooter className={cn(pathname !== '/' && 'hidden lg:block')} />
      {!focused && <MobileNav />}
      <Toaster position="top-center" richColors={false} closeButton />
      <LiveAnnouncer />
      <SessionLifecycle />
    </>
  )
}

function NotFound() {
  return (
    <section className="page-container flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-text-secondary">O endereço acessado não existe ou foi removido.</p>
      <Link to="/" className="text-text-accent underline underline-offset-4">
        Voltar ao início
      </Link>
    </section>
  )
}
