import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'

const boxClass = 'grid size-[35px] place-items-center rounded-[4px] text-lg leading-4'

const WINDOW = 4

/** A sliding window of four page numbers, as in the Figma pagination ("1 2 3 4 >"). */
function pagesToShow(current: number, total: number): number[] {
  const start = Math.max(1, Math.min(current - 1, total - WINDOW + 1))
  return Array.from({ length: Math.min(WINDOW, total) }, (_, i) => start + i)
}

export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  const toPage = (p: number) => (prev: Record<string, unknown>) => ({ ...prev, page: p === 1 ? undefined : p })

  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-end">
      <ul className="flex gap-2">
        {page > 1 && (
          <li>
            <Link to="/" search={toPage(page - 1)} hash="mercado" className={cn(boxClass, 'border border-border')} aria-label="Página anterior">
              <svg viewBox="0 0 18 18" className="size-[18px] rotate-180" aria-hidden="true">
                <path d="M6.75 3.75 12 9l-5.25 5.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </li>
        )}
        {pagesToShow(page, totalPages).map((p) => (
          <li key={p}>
            <Link
              to="/"
              search={toPage(p)}
              hash="mercado"
              aria-label={`Página ${p} de ${totalPages}`}
              aria-current={p === page ? 'page' : undefined}
              className={cn(boxClass, p === page ? 'bg-primary font-bold text-ink' : 'border border-border hover:border-primary')}
            >
              {p}
            </Link>
          </li>
        ))}
        {page < totalPages && (
          <li>
            <Link to="/" search={toPage(page + 1)} hash="mercado" className={cn(boxClass, 'border border-border hover:border-primary')} aria-label="Próxima página">
              <svg viewBox="0 0 18 18" className="size-[18px]" aria-hidden="true">
                <path d="M6.75 3.75 12 9l-5.25 5.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
