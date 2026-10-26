import { useId, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Slider } from '@/shared/components/ui/slider'
import { CATEGORY_LABELS, NETWORK_LABELS, type Category, type Network } from '@/shared/contracts/common'
import type { CatalogSearch, NftListResponse } from '@/shared/contracts/nft'
import { cn } from '@/shared/lib/utils'

type Facets = NftListResponse['facets']

interface CatalogFiltersProps {
  facets: Facets | undefined
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
  /** Called after "Aplicar" (the mobile sheet closes itself). */
  onApplied?: () => void
  className?: string
}

const toggle = <T,>(list: T[] | undefined, value: T) => {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]
  return next.length > 0 ? next : undefined
}

/** "0,02 - 12,30 ETH", as in the Figma price filter. */
const formatRange = (min: number, max: number) => `${min.toFixed(2).replace('.', ',')} - ${max.toFixed(2).replace('.', ',')} ETH`

function FacetList<T extends string>({
  title,
  items,
  selected,
  labels,
  onToggle,
  boldCount,
}: {
  title: string
  items: Array<{ id: T; count: number }> | undefined
  selected: T[] | undefined
  labels: Record<T, string>
  onToggle: (id: T) => void
  boldCount?: boolean
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg leading-4 font-bold">
        {title}
      </h2>
      <ul className="px-3">
        {items
          ? items.map(({ id, count }) => {
              const active = selected?.includes(id) ?? false
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(id)}
                    className={cn(
                      'flex h-10 w-full items-center justify-between rounded-sm text-[15px] leading-10 transition-colors hover:text-text-accent motion-reduce:transition-none',
                      active ? 'text-text-accent' : 'text-text-secondary',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className={cn('size-1.5 rounded-full', active ? 'bg-primary' : 'bg-transparent')} />
                      {labels[id]}
                    </span>
                    <span className={cn(boldCount && 'font-bold')}>
                      ({count})<span className="sr-only"> NFTs</span>
                    </span>
                  </button>
                </li>
              )
            })
          : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="my-3 h-4 w-full" />)}
      </ul>
    </section>
  )
}

/** The slider keeps a draft until "Aplicar"; it is remounted (keyed) when the applied range or bounds change. */
function PriceFilter({ facets, search, onChange, onApplied }: Pick<CatalogFiltersProps, 'facets' | 'search' | 'onChange' | 'onApplied'>) {
  const headingId = useId()
  const bounds = facets ? [Number(facets.priceRange.min), Number(facets.priceRange.max)] : null
  const [draft, setRange] = useState<[number, number] | null>(null)
  const range: [number, number] | null = draft ?? (bounds ? [search.minPrice ?? bounds[0]!, search.maxPrice ?? bounds[1]!] : null)

  const apply = () => {
    if (!bounds || !range) return
    onChange({
      minPrice: range[0] > bounds[0]! ? range[0] : undefined,
      maxPrice: range[1] < bounds[1]! ? range[1] : undefined,
    })
    onApplied?.()
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg leading-4 font-bold">
        Faixa de preço
      </h2>
      <div className="flex flex-col gap-3 pl-3">
        {bounds && range ? (
          <>
            <Slider
              min={bounds[0]}
              max={bounds[1]}
              step={0.01}
              value={range}
              minStepsBetweenThumbs={1}
              onValueChange={(value) => setRange([value[0]!, value[1]!])}
              thumbLabels={['Preço mínimo em ETH', 'Preço máximo em ETH']}
              className="py-1.5"
            />
            <p className="text-[15px] leading-5" aria-live="polite">
              Preço: {formatRange(range[0], range[1])}
            </p>
          </>
        ) : (
          <Skeleton className="h-12 w-full" />
        )}
        <Button type="button" onClick={apply} disabled={!bounds} className="h-9 w-fit rounded-md px-3 text-base">
          Aplicar
        </Button>
      </div>
    </section>
  )
}

export function CatalogFilters({ facets, search, onChange, onApplied, className }: CatalogFiltersProps) {
  const hasFilters = Boolean(search.category?.length || search.network?.length || search.minPrice !== undefined || search.maxPrice !== undefined)
  return (
    <div className={cn('flex flex-col gap-10 bg-card p-5', className)}>
      <FacetList<Category>
        title="Coleções"
        items={facets?.categories}
        selected={search.category}
        labels={CATEGORY_LABELS}
        onToggle={(id) => onChange({ category: toggle(search.category, id) })}
        boldCount
      />
      <PriceFilter
        key={`${search.minPrice}-${search.maxPrice}-${facets?.priceRange.min}-${facets?.priceRange.max}`}
        facets={facets}
        search={search}
        onChange={onChange}
        onApplied={onApplied}
      />
      <FacetList<Network>
        title="Rede"
        items={facets?.networks}
        selected={search.network}
        labels={NETWORK_LABELS}
        onToggle={(id) => onChange({ network: toggle(search.network, id) })}
      />
      {hasFilters && (
        <Button
          type="button"
          variant="link"
          className="w-fit"
          onClick={() => onChange({ category: undefined, network: undefined, minPrice: undefined, maxPrice: undefined })}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
