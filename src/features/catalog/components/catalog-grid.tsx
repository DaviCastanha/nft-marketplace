import { useEffect, useRef } from 'react'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { announce } from '@/shared/a11y/announcer'
import type { ApiError } from '@/shared/api/errors'
import { Button } from '@/shared/components/ui/button'
import { CATALOG_PAGE_SIZE, type NftListResponse } from '@/shared/contracts/nft'
import { cn } from '@/shared/lib/utils'

interface CatalogGridProps {
  data: NftListResponse | undefined
  error: ApiError | null
  isPending: boolean
  /** Background refetch or new params while previous results stay on screen. */
  isUpdating: boolean
  onRetry: () => void
  onClearFilters: () => void
  hasFilters: boolean
}

const DESKTOP_SIZES = '(min-width: 1024px) 258px, 50vw'

export function CatalogGrid({ data, error, isPending, isUpdating, onRetry, onClearFilters, hasFilters }: CatalogGridProps) {
  const lastAnnounced = useRef<string | null>(null)

  useEffect(() => {
    if (!data || isUpdating) return
    const message = data.total === 0 ? 'Nenhum NFT encontrado.' : `${data.total} NFTs encontrados. Página ${data.page} de ${data.totalPages}.`
    if (message !== lastAnnounced.current) {
      lastAnnounced.current = message
      announce(message)
    }
  }, [data, isUpdating])

  if (isPending) {
    return (
      <div role="status" aria-label="Carregando NFTs" className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:gap-x-8 lg:gap-y-[72px]">
        {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
          <NftCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error && !data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 bg-card p-8">
        <h3 className="text-lg font-bold">Não foi possível carregar os NFTs</h3>
        <p className="text-text-secondary">{error.message}</p>
        <Button type="button" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 bg-card p-8">
        <h3 className="text-lg font-bold">Nenhum NFT encontrado</h3>
        <p className="text-text-secondary">
          {hasFilters ? 'Ajuste a busca ou os filtros para ver mais resultados.' : 'Ainda não há NFTs listados no mercado.'}
        </p>
        {hasFilters && (
          <Button type="button" variant="outline" onClick={onClearFilters}>
            Limpar busca e filtros
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-coral/60 px-4 py-3 text-sm">
          <span>Não foi possível atualizar os resultados. Exibindo a última versão carregada.</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
      <ul
        aria-busy={isUpdating}
        className={cn(
          'grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity sm:grid-cols-3 lg:gap-x-8 lg:gap-y-[72px] motion-reduce:transition-none',
          isUpdating && 'opacity-60',
        )}
      >
        {data.items.map((nft, index) => (
          // Staggered right column on phones, as in the mobile frame.
          <li key={nft.id} className="max-sm:even:mt-8">
            <NftCard nft={nft} sizes={DESKTOP_SIZES} priority={index < 3} />
          </li>
        ))}
      </ul>
    </div>
  )
}
