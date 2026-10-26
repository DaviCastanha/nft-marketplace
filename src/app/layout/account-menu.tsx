import { Link } from '@tanstack/react-router'
import { useLogout } from '@/features/auth/use-logout'
import { HeartOutlineIcon, LocationIcon, LoginIcon, UserIcon } from '@/shared/components/icons'
import { UserAvatar } from '@/shared/components/user-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import type { User } from '@/shared/contracts/account'

export function AccountMenu({ user }: { user: User }) {
  const logout = useLogout()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-[35px] max-w-[180px] items-center gap-2 rounded-md border border-primary px-2 text-sm font-medium text-text-accent"
        aria-label={`Menu da conta de ${user.displayName}`}
      >
        <UserAvatar user={user} className="size-6" />
        <span className="truncate">{user.username}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-text-secondary">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account/profile">
            <UserIcon className="size-4" /> Dados do perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/wallets">
            <LocationIcon className="size-4" /> Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/favorites">
            <HeartOutlineIcon className="size-4" /> Lista de interesse
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()} disabled={logout.isPending}>
          <LoginIcon className="size-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
