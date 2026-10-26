import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { cartQueries } from '@/features/cart/api'
import { AccountMenu } from '@/app/layout/account-menu'
import { SearchDialog } from '@/app/layout/search-dialog'
import { CartIcon, LoginIcon, SearchIcon } from '@/shared/components/icons'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { notifyUnavailable } from '@/shared/lib/unavailable'
import { useCurrentUser } from '@/shared/session/session-store'

const MARKET_PATHS = ['/nfts', '/cart', '/checkout', '/orders']

function NavItem({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'relative flex h-[45px] items-start text-base leading-[21px]',
        active ? 'font-bold text-text-accent' : 'text-foreground',
      )}
    >
      {children}
      {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-primary" />}
    </span>
  )
}

export function SiteHeader() {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  const [searchOpen, setSearchOpen] = useState(false)
  const cart = useQuery({ ...cartQueries.cart(user?.id ?? null), select: (c) => c.itemCount })
  const itemCount = cart.data ?? 0
  const inMarket = MARKET_PATHS.some((p) => pathname.startsWith(p))

  return (
    <header className="page-container hidden pt-6 lg:block">
      <div className="relative flex h-[45px] items-start justify-between border-b-[0.5px] border-primary/70">
        <Link to="/" className="mt-2 w-40 text-sm leading-[18px] font-bold tracking-[1.4px]" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="absolute left-1/2 flex -translate-x-1/2 gap-10">
          <Link to="/" aria-current={pathname === '/' ? 'page' : undefined} className="rounded-sm">
            <NavItem active={pathname === '/'}>Início</NavItem>
          </Link>
          <Link to="/" hash="mercado" aria-current={inMarket ? 'page' : undefined} className="rounded-sm">
            <NavItem active={inMarket}>Mercado</NavItem>
          </Link>
          <button type="button" onClick={() => notifyUnavailable('A área de criadores')} className="rounded-sm">
            <NavItem active={false}>Criadores</NavItem>
          </button>
          <button type="button" onClick={() => notifyUnavailable('A área de conteúdos')} className="rounded-sm">
            <NavItem active={false}>Aprenda</NavItem>
          </button>
        </nav>

        <div className="flex items-center gap-7">
          <button type="button" onClick={() => setSearchOpen(true)} className="grid size-8 place-items-center rounded-sm" aria-label="Buscar NFTs">
            <SearchIcon className="size-5" />
          </button>
          <Link to="/cart" className="relative grid size-8 place-items-center rounded-sm" aria-label={`Carrinho, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}>
            <CartIcon className="h-6 w-[25px]" />
            {itemCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full border-2 border-ink bg-primary text-[10px] leading-[13px] font-medium text-ink"
              >
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <Button asChild size="sm" className="w-[100px] gap-1 rounded-md px-0 text-base font-medium">
              <Link to="/login" search={{ redirect: pathname === '/login' ? undefined : pathname }}>
                <LoginIcon className="size-5 text-ink" />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}
