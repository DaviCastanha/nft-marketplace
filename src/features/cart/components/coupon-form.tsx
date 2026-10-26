import { useId, useState } from 'react'
import { useApplyCoupon, useRemoveCoupon } from '@/features/cart/hooks'
import { announce } from '@/shared/a11y/announcer'
import type { Coupon } from '@/shared/contracts/commerce'
import { cn } from '@/shared/lib/utils'

export function CouponForm({ coupon, className }: { coupon: Coupon | null; className?: string }) {
  const inputId = useId()
  const errorId = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()

  if (coupon) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <p className="text-sm font-bold">Código promocional</p>
        <div className="flex items-center justify-between gap-3 rounded-sm border border-primary px-3 py-2 text-sm">
          <span>
            <strong className="text-text-accent">{coupon.code}</strong> aplicado: {coupon.percentOff}% de desconto
          </span>
          <button
            type="button"
            className="text-text-accent underline underline-offset-4"
            disabled={remove.isPending}
            onClick={() => remove.mutate(undefined, { onSuccess: () => announce(`Código ${coupon.code} removido.`) })}
          >
            Remover
          </button>
        </div>
      </div>
    )
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const value = code.trim()
    if (!value) {
      setError('Informe um código promocional.')
      return
    }
    setError(null)
    apply.mutate(
      { code: value },
      {
        onSuccess: (cart) => {
          setCode('')
          announce(`Código ${cart.coupon?.code ?? value} aplicado.`)
        },
        onError: (err) => {
          setError(err.fields.code ?? err.message)
          announce(err.fields.code ?? err.message)
        },
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-sm font-bold">
        Código promocional
      </label>
      <div className="flex h-10 overflow-hidden rounded-sm border border-primary max-lg:h-[50px] max-lg:rounded-full max-lg:border-0 max-lg:bg-surface-raised">
        <input
          id={inputId}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent pl-2 text-xs placeholder:text-text-tertiary focus-visible:outline-offset-[-2px] max-lg:pl-4 max-lg:text-[13px]"
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className="w-[101px] shrink-0 bg-primary text-base font-bold text-ink hover:bg-brand-amber disabled:opacity-60 max-lg:rounded-full max-lg:bg-gradient-to-r max-lg:from-primary max-lg:to-primary/80"
        >
          {apply.isPending ? '…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-coral">
          {error}
        </p>
      )}
    </form>
  )
}
