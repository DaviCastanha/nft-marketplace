import { useId } from 'react'
import { ChevronDownIcon } from '@/shared/components/icons'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import {
  CATALOG_TAB_LABELS,
  CATALOG_TABS,
  catalogDefaults,
  SORT_LABELS,
  SORT_OPTIONS,
  type CatalogSearch,
  type CatalogSort,
} from '@/shared/contracts/nft'
import { cn } from '@/shared/lib/utils'

interface CatalogToolbarProps {
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
}

export function CatalogTabs({ search, onChange, className }: CatalogToolbarProps & { className?: string }) {
  const current = search.tab ?? catalogDefaults.tab
  return (
    <div role="group" aria-label="Vitrines do catálogo" className={cn('flex gap-5', className)}>
      {CATALOG_TABS.map((tab) => {
        const active = tab === current
        return (
          <button
            key={tab}
            type="button"
            aria-pressed={active}
            onClick={() => onChange({ tab: tab === catalogDefaults.tab ? undefined : tab })}
            className={cn(
              'relative pb-1.5 text-[15px] leading-4 font-medium whitespace-nowrap',
              active ? 'text-text-accent' : 'text-foreground hover:text-text-accent',
            )}
          >
            {CATALOG_TAB_LABELS[tab]}
            {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}

export function CatalogSort({ search, onChange }: CatalogToolbarProps) {
  const labelId = useId()
  return (
    <div className="flex items-center gap-1 text-[15px] leading-5">
      <span id={labelId}>Ordenar por:</span>
      <Select
        value={search.sort ?? catalogDefaults.sort}
        onValueChange={(value) => onChange({ sort: value === catalogDefaults.sort ? undefined : (value as CatalogSort) })}
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className="h-auto gap-1 border-0 bg-transparent p-0 text-[15px] text-foreground shadow-none focus-visible:ring-2 [&>svg:last-child]:hidden"
        >
          <SelectValue />
          <ChevronDownIcon className="size-4" />
        </SelectTrigger>
        <SelectContent align="end">
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {SORT_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
