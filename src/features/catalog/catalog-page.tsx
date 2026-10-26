import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { catalogQueries } from '@/features/catalog/api'
import { CatalogFilters } from '@/features/catalog/components/catalog-filters'
import { CatalogGrid } from '@/features/catalog/components/catalog-grid'
import { CatalogPagination } from '@/features/catalog/components/catalog-pagination'
import { CatalogSort, CatalogTabs } from '@/features/catalog/components/catalog-toolbar'
import { HomeHero } from '@/features/catalog/components/home-hero'
import { FeaturedSpotlight, MintJournal, PromoCards } from '@/features/catalog/components/home-sections'
import { FilterButtonIcon, SearchOutlineIcon } from '@/shared/components/icons'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import type { CatalogSearch } from '@/shared/contracts/nft'

const route = getRouteApi('/')

function useCatalogSearch() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  /** Any filter change returns to page 1; history entries make back/forward restore the state. */
  const update = (patch: Partial<CatalogSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), resetScroll: false })
  return { search, update }
}

// Search inputs keep a local draft; they are keyed by the applied query so they reset
// when the URL changes (history navigation, "limpar busca").
function MobileSearchBar({ search, onSearch, onOpenFilters }: { search: CatalogSearch; onSearch: (q: string | undefined) => void; onOpenFilters: () => void }) {
  const inputId = useId()
  const [value, setValue] = useState(search.q ?? '')

  return (
    <div className="page-container flex gap-2 pt-10 lg:hidden">
      <form
        role="search"
        className="flex h-[45px] flex-1 items-center gap-2 rounded-[10px] bg-card px-3"
        onSubmit={(e) => {
          e.preventDefault()
          onSearch(value.trim() || undefined)
        }}
      >
        <SearchOutlineIcon className="size-[22px] shrink-0 text-text-tertiary" />
        <label htmlFor={inputId} className="sr-only">
          Buscar NFTs
        </label>
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Explorar coleções"
          className="min-w-0 flex-1 bg-transparent text-base leading-[22px] font-medium placeholder:text-text-tertiary focus-visible:outline-none"
        />
      </form>
      <button type="button" onClick={onOpenFilters} aria-label="Abrir filtros" className="shrink-0 rounded-[14px]">
        <FilterButtonIcon className="size-[45px]" />
      </button>
    </div>
  )
}

export function CatalogPage() {
  const { search, update } = useCatalogSearch()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const list = useQuery(catalogQueries.list(search))
  const hasFilters = Boolean(search.q || search.category?.length || search.network?.length || search.minPrice !== undefined || search.maxPrice !== undefined)

  const clearAll = () => update({ q: undefined, category: undefined, network: undefined, minPrice: undefined, maxPrice: undefined })

  return (
    <div className="flex flex-col gap-6 lg:gap-24">
      <MobileSearchBar key={search.q ?? ''} search={search} onSearch={(q) => update({ q })} onOpenFilters={() => setFiltersOpen(true)} />
      <div className="lg:pt-8">
        <HomeHero />
      </div>

      <section id="mercado" aria-labelledby="catalog-title" className="page-container flex scroll-mt-6 gap-12">
        <aside aria-label="Filtros do catálogo" className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
          <CatalogFilters facets={list.data?.facets} search={search} onChange={update} />
          <FeaturedSpotlight />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-8 lg:gap-[88px]">
          <div className="flex flex-col gap-6 lg:gap-8">
            <h2 id="catalog-title" className="sr-only">
              Catálogo de NFTs
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CatalogTabs search={search} onChange={update} className="max-lg:w-full max-lg:gap-4 max-lg:overflow-x-auto" />
              <div className="max-lg:hidden">
                <CatalogSort search={search} onChange={update} />
              </div>
            </div>
            {search.q && (
              <p className="text-sm text-text-secondary">
                Resultados para <strong className="text-foreground">“{search.q}”</strong>{' '}
                <button type="button" className="text-text-accent underline underline-offset-4" onClick={() => update({ q: undefined })}>
                  limpar busca
                </button>
              </p>
            )}
            <CatalogGrid
              data={list.data}
              error={list.error}
              isPending={list.isPending}
              isUpdating={list.isPlaceholderData || (list.isFetching && !list.isPending)}
              onRetry={() => void list.refetch()}
              onClearFilters={clearAll}
              hasFilters={hasFilters}
            />
          </div>
          {list.data && !list.isPlaceholderData && <CatalogPagination page={list.data.page} totalPages={list.data.totalPages} />}
        </div>
      </section>

      <PromoCards />
      <MintJournal />

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-[31px] border-0 bg-card p-0">
          <SheetHeader className="px-5 pt-6">
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Combine coleções, faixa de preço e rede.</SheetDescription>
          </SheetHeader>
          <div className="px-5 pt-4">
            <CatalogSort search={search} onChange={update} />
          </div>
          <CatalogFilters facets={list.data?.facets} search={search} onChange={update} onApplied={() => setFiltersOpen(false)} className="pb-10" />
        </SheetContent>
      </Sheet>
    </div>
  )
}
