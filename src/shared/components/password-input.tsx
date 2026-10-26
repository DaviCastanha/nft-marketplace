import { useState } from 'react'
import { EyeOffIcon } from '@/shared/components/icons'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'

/** Password field with a visibility toggle (eye icon from the Figma inputs). */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-text-tertiary hover:text-foreground"
      >
        <EyeOffIcon className={cn('size-5', visible && 'opacity-60')} />
      </button>
    </div>
  )
}
