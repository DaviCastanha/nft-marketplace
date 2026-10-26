import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { cartQueries } from '@/features/cart/api'
import { CartSmallIcon, HeartFilledIcon, HomeIcon, ScanIcon, UserFilledIcon } from '@/shared/components/icons'
import { cn } from '@/shared/lib/utils'
import { notifyUnavailable } from '@/shared/lib/unavailable'
import { useCurrentUser } from '@/shared/session/session-store'

const itemClass = (active: boolean) =>
  cn('relative grid size-11 place-items-center rounded-md', active ? 'text-primary' : 'text-text-secondary')

/** Bottom navigation from the mobile frames (home, favorites, scan, cart, account). */
export function MobileNav() {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  const count = useQuery({ ...cartQueries.cart(user?.id ?? null), select: (c) => c.itemCount }).data ?? 0

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-[40px] bg-surface-card px-6 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-10px_30px_0_#0a060473] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center justify-between">
        <li>
          <Link to="/" className={itemClass(pathname === '/')} aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined}>
            <HomeIcon className="size-6" />
          </Link>
        </li>
        <li>
          <Link to="/favorites" className={itemClass(pathname === '/favorites')} aria-label="Favoritos">
            <HeartFilledIcon className="size-6" />
          </Link>
        </li>
        <li className="-mt-10">
          <button
            type="button"
            onClick={() => notifyUnavailable('A leitura de QR code')}
            aria-label="Escanear QR code de NFT"
            className="grid size-16 place-items-center rounded-full border-4 border-ink bg-gradient-to-b from-primary/80 to-primary text-ink shadow-raised"
          >
            <ScanIcon className="size-7" />
          </button>
        </li>
        <li>
          <Link to="/cart" className={itemClass(pathname === '/cart')} aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}>
            <CartSmallIcon className="size-6" />
            {count > 0 && (
              <span aria-hidden="true" className="absolute top-1 right-0.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-medium text-ink">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link
            to={user ? '/account/profile' : '/login'}
            className={itemClass(pathname.startsWith('/account'))}
            aria-label={user ? 'Minha conta' : 'Entrar'}
          >
            <UserFilledIcon className="size-6" />
          </Link>
        </li>
      </ul>
    </nav>
  )
}

/** Compact top bar for inner mobile screens (back button + title), as in the mobile frames. */
export function MobileTopBar({ title, action }: { title?: string; action?: React.ReactNode }) {
  return (
    <div className="page-container flex h-16 items-center gap-4 lg:hidden">
      <button
        type="button"
        onClick={() => window.history.back()}
        aria-label="Voltar"
        className="grid size-[35px] shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-text-tertiary"
      >
        <svg viewBox="0 0 35 35" className="size-[35px]" aria-hidden="true">
          <path d="M19.92 22.83s-5.84-3.45-5.84-5.83c0-2.38 5.84-5.83 5.84-5.83" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {title && <h1 className="flex-1 text-center text-xl leading-6 font-bold">{title}</h1>}
      <div className="flex min-w-[35px] justify-end">{action}</div>
    </div>
  )
}
