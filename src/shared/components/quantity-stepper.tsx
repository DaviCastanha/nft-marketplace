import { useId } from 'react'
import { cn } from '@/shared/lib/utils'

interface QuantityStepperProps {
  value: number
  max: number
  onChange: (value: number) => void
  /** Accessible context, e.g. "Emerald Ape #042". */
  label: string
  disabled?: boolean
  /** "pill": tall amber buttons (desktop detail). "round": small circles (cart, mobile). */
  variant?: 'pill' | 'round'
  className?: string
}

const MIN = 1

export function QuantityStepper({ value, max, onChange, label, disabled, variant = 'round', className }: QuantityStepperProps) {
  const hintId = useId()
  const atMin = value <= MIN
  const atMax = value >= max
  const buttonClass =
    variant === 'pill'
      ? 'grid h-[50px] w-[33px] place-items-center rounded-full border border-ink bg-primary text-ink shadow-[0_4px_12px_-2px_#140d0a26]'
      : 'grid size-6 place-items-center rounded-full bg-primary text-ink'

  return (
    <div className={cn('flex items-center', variant === 'pill' ? 'gap-3' : 'gap-3', className)} role="group" aria-label={`Quantidade de ${label}`}>
      <button
        type="button"
        className={cn(buttonClass, 'disabled:bg-surface-raised disabled:text-text-tertiary')}
        onClick={() => onChange(value - 1)}
        disabled={disabled || atMin}
        aria-label={`Diminuir quantidade de ${label}`}
        aria-describedby={hintId}
      >
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <output aria-live="polite" className={cn('min-w-5 text-center tabular-nums', variant === 'pill' ? 'text-xl leading-7' : 'text-lg')}>
        {value}
      </output>
      <button
        type="button"
        className={cn(buttonClass, 'disabled:bg-surface-raised disabled:text-text-tertiary')}
        onClick={() => onChange(value + 1)}
        disabled={disabled || atMax}
        aria-label={`Aumentar quantidade de ${label}`}
        aria-describedby={hintId}
      >
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <span id={hintId} className="sr-only">
        {max === 0 ? 'Indisponível.' : `Máximo de ${max} por pedido.`}
      </span>
    </div>
  )
}
