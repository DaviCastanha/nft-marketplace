import type { User } from '@/shared/contracts/account'
import { cn } from '@/shared/lib/utils'

export function UserAvatar({ user, className }: { user: Pick<User, 'displayName' | 'avatarUrl'>; className?: string }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={cn('rounded-full object-cover', className)} />
  }
  return (
    <span aria-hidden="true" className={cn('grid place-items-center rounded-full bg-primary text-xs font-bold text-ink', className)}>
      {user.displayName.slice(0, 1).toUpperCase()}
    </span>
  )
}
