import { useId } from 'react'
import type { Edition } from '@/shared/contracts/nft'
import { cn } from '@/shared/lib/utils'

interface EditionPickerProps {
  editions: Edition[]
  value: string
  onChange: (editionId: string) => void
}

/** Edition chips; sold-out editions stay visible but cannot be picked (struck through + label). */
export function EditionPicker({ editions, value, onChange }: EditionPickerProps) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-3">
      <p id={labelId} className="text-[15px] leading-4 font-bold">
        Edição:
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-1.5 lg:gap-1.5">
        {editions.map((edition) => {
          const selected = edition.id === value
          const soldOut = edition.available === 0
          return (
            <button
              key={edition.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={soldOut}
              onClick={() => !soldOut && onChange(edition.id)}
              title={soldOut ? 'Edição esgotada' : undefined}
              className={cn(
                'h-7 rounded-full border px-2 text-sm leading-4 transition-colors motion-reduce:transition-none',
                selected ? 'border-primary font-medium text-text-accent' : 'border-border text-text-secondary hover:border-primary/60',
                soldOut && 'cursor-not-allowed text-text-tertiary/70 line-through',
              )}
            >
              {edition.label}
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
