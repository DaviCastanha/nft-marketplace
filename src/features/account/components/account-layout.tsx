import { Link } from '@tanstack/react-router'
import { MobileTopBar } from '@/app/layout/mobile-nav'
import { useLogout } from '@/features/auth/use-logout'
import { ActivityIcon, CartSmallIcon, DangerIcon, DownloadIcon, HeartOutlineIcon, LocationIcon, LoginIcon, UserIcon } from '@/shared/components/icons'
import { notifyUnavailable } from '@/shared/lib/unavailable'
import { cn } from '@/shared/lib/utils'

type Section = 'profile' | 'wallets' | 'favorites'

const itemClass = (active: boolean) =>
  cn(
    'relative flex h-[45px] w-full items-center gap-3 px-4 text-[15px] text-text-accent transition-colors hover:bg-surface-raised motion-reduce:transition-none',
    active && 'before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-primary',
  )

/** "Meu perfil" sidebar from the account frames; out-of-scope entries say so instead of navigating. */
export function AccountLayout({ active, title, children }: { active: Section; title: string; children: React.ReactNode }) {
  const logout = useLogout()
  const unavailable = (label: string) => () => notifyUnavailable(`A área "${label}"`)

  return (
    <div className="flex flex-col">
      <MobileTopBar title={title} />
      <div className="page-container flex flex-col gap-7 pb-12 lg:flex-row lg:pt-8">
        <nav aria-label="Minha conta" className="shrink-0 bg-card lg:w-[310px] lg:self-start">
          <p className="hidden px-2.5 pt-6 pb-2 text-xl font-bold lg:block">Meu perfil</p>
          <ul className="flex overflow-x-auto lg:flex-col lg:overflow-visible">
            <li className="shrink-0">
              <Link to="/account/profile" className={itemClass(active === 'profile')} aria-current={active === 'profile' ? 'page' : undefined}>
                <UserIcon className="size-5" /> Dados do perfil
              </Link>
            </li>
            <li className="shrink-0">
              <Link to="/account/wallets" className={itemClass(active === 'wallets')} aria-current={active === 'wallets' ? 'page' : undefined}>
                <LocationIcon className="size-5" /> Carteiras
              </Link>
            </li>
            <li className="shrink-0 max-lg:hidden">
              <button type="button" className={itemClass(false)} onClick={unavailable('Atividade')}>
                <CartSmallIcon className="size-5" /> Atividade
              </button>
            </li>
            <li className="shrink-0">
              <Link to="/favorites" className={itemClass(active === 'favorites')} aria-current={active === 'favorites' ? 'page' : undefined}>
                <HeartOutlineIcon className="size-5" /> Lista de interesse
              </Link>
            </li>
            <li className="shrink-0 max-lg:hidden">
              <button type="button" className={itemClass(false)} onClick={unavailable('Ofertas')}>
                <ActivityIcon className="size-5" /> Ofertas
              </button>
            </li>
            <li className="shrink-0 max-lg:hidden">
              <button type="button" className={itemClass(false)} onClick={unavailable('Arquivos baixados')}>
                <DownloadIcon className="size-5" /> Arquivos baixados
              </button>
            </li>
            <li className="shrink-0 max-lg:hidden">
              <button type="button" className={itemClass(false)} onClick={unavailable('Suporte')}>
                <DangerIcon className="size-5" /> Suporte
              </button>
            </li>
            <li className="shrink-0 lg:border-t lg:border-border">
              <button type="button" className={cn(itemClass(false), 'font-bold')} onClick={() => logout.mutate()} disabled={logout.isPending}>
                <LoginIcon className="size-5" /> Sair
              </button>
            </li>
          </ul>
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
