import { Skeleton } from '@/shared/components/ui/skeleton'
import type { Quote } from '@/shared/contracts/commerce'
import { formatEth, formatEthValue } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'

/** Subtotal, discount, fee and total exactly as returned by the API quote. */
export function PriceSummary({ quote, isPending, className }: { quote: Quote | undefined; isPending: boolean; className?: string }) {
  if (isPending || !quote) {
    return (
      <div role="status" aria-label="Calculando resumo" className={cn('flex flex-col gap-3', className)}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
        <div className="mt-3 flex justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
    )
  }
  return (
    <dl className={cn('flex flex-col gap-3 text-[15px] leading-5', className)}>
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd className="text-lg">{formatEth(quote.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>{quote.coupon?.label ?? 'Desconto do lançamento'}</dt>
        <dd>
          (-) {formatEthValue(quote.discount)}
          {Number(quote.discount) > 0 && ' ETH'}
        </dd>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex w-full justify-between">
          <dt>Taxa de rede</dt>
          <dd className="text-lg">{formatEth(quote.networkFee)}</dd>
        </div>
        <span className="text-xs text-text-accent">Taxa estimada</span>
      </div>
      <div className="mt-3 flex justify-between font-bold">
        <dt className="text-base">Total</dt>
        <dd className="text-lg text-text-accent" data-testid="quote-total">
          {formatEth(quote.total)}
        </dd>
      </div>
    </dl>
  )
}
