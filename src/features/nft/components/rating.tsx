import { StarIcon } from '@/shared/components/icons'
import { cn } from '@/shared/lib/utils'

export function RatingStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('flex gap-1', className)} aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className={cn('size-[15px]', i < Math.round(rating) ? 'text-brand-amber' : 'text-border-soft')} />
      ))}
    </span>
  )
}
