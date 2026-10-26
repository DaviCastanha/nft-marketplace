import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useAddToCart } from '@/features/cart/hooks'
import { useFavoriteIds, useToggleFavorite } from '@/features/favorites/api'
import { CartSmallIcon, HeartFilledIcon, HeartOutlineIcon, SearchOutlineIcon } from '@/shared/components/icons'
import { NftImage } from '@/shared/components/nft-image'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { NftSummary } from '@/shared/contracts/nft'
import { formatEth } from '@/shared/lib/money'

const actionClass =
  'grid size-9 place-items-center rounded-md bg-ink/85 text-foreground transition-colors hover:text-text-accent disabled:opacity-60 motion-reduce:transition-none'

/** Default edition used by the quick "add to cart" action: the one the card price refers to. */
const DEFAULT_EDITION = { id: '1-50', label: '1/50' }

interface NftCardProps {
  nft: NftSummary
  sizes: string
  priority?: boolean
}

/**
 * Catalog card. Below `lg` it follows the mobile frames (rounded card with the info
 * inside and a heart on the artwork); from `lg` up, the desktop grid card with
 * hover/focus quick actions.
 */
export function NftCard({ nft, sizes, priority }: NftCardProps) {
  const favorites = useFavoriteIds()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const [zoomOpen, setZoomOpen] = useState(false)
  const isFavorite = favorites.has(nft.id)
  const soldOut = nft.available === 0
  const favoriteLabel = isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`

  return (
    <article
      className="group relative flex flex-col gap-3 rounded-[24px] bg-card p-1.5 pb-4 lg:rounded-none lg:bg-transparent lg:p-0"
      aria-labelledby={`nft-${nft.id}-name`}
    >
      <div className="relative grid place-items-center lg:aspect-[258/300] lg:bg-card lg:p-1">
        <NftImage image={nft.image} sizes={sizes} priority={priority} alt="" className="w-full rounded-[20px] lg:rounded-[15px]" />
        {nft.badge === 'rare' && (
          <span className="absolute top-0 left-0 rounded-tl-[20px] bg-primary px-3.5 py-1 text-sm font-medium text-ink lg:rounded-none">RARO</span>
        )}
        {soldOut && <span className="absolute bottom-3 left-3 rounded-sm bg-ink/90 px-2 py-0.5 text-xs font-bold text-coral">Esgotado</span>}

        {/* Mobile: heart on the artwork corner. */}
        <button
          type="button"
          className="absolute top-2 right-2 z-10 grid size-9 place-items-center rounded-full bg-surface-raised/90 text-foreground lg:hidden"
          aria-label={favoriteLabel}
          aria-pressed={isFavorite}
          onClick={() => toggleFavorite(nft, !isFavorite)}
        >
          {isFavorite ? <HeartFilledIcon className="size-[18px] text-primary" /> : <HeartOutlineIcon className="size-[18px]" />}
        </button>

        {/* Desktop: quick actions shown on hover and whenever focus is inside the card. */}
        <div className="absolute inset-x-0 bottom-5 z-10 hidden justify-center gap-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none lg:flex">
          <button
            type="button"
            className={actionClass}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            disabled={soldOut || addToCart.isPending}
            onClick={() => addToCart.add({ nftId: nft.id, editionId: DEFAULT_EDITION.id, quantity: 1, name: nft.name, editionLabel: DEFAULT_EDITION.label })}
          >
            <CartSmallIcon className="size-5" />
          </button>
          <button type="button" className={actionClass} aria-label={favoriteLabel} aria-pressed={isFavorite} onClick={() => toggleFavorite(nft, !isFavorite)}>
            {isFavorite ? <HeartFilledIcon className="size-5 text-primary" /> : <HeartOutlineIcon className="size-5" />}
          </button>
          <button type="button" className={actionClass} aria-label={`Ampliar imagem de ${nft.name}`} onClick={() => setZoomOpen(true)}>
            <SearchOutlineIcon className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-1 sm:px-2 lg:px-0">
        <h3 id={`nft-${nft.id}-name`} className="text-[15px] leading-5 font-normal sm:text-base lg:leading-4">
          {/* Stretched link: the whole card opens the detail while the actions stay separate buttons. */}
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 after:rounded-[24px] after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring lg:after:rounded-none"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-3 text-lg leading-5 font-bold text-text-accent lg:leading-4">
          <span>
            <span className="sr-only">Preço: </span>
            {formatEth(nft.price)}
          </span>
          {nft.compareAtPrice && (
            <s className="font-normal text-text-tertiary">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.compareAtPrice)}
            </s>
          )}
        </p>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[min(90vw,640px)] p-3">
          <DialogTitle className="sr-only">{nft.name}</DialogTitle>
          <DialogDescription className="sr-only">{nft.image.alt}</DialogDescription>
          <NftImage image={nft.image} sizes="640px" className="w-full rounded-[15px]" />
        </DialogContent>
      </Dialog>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-card p-1.5 pb-4 lg:rounded-none lg:bg-transparent lg:p-0" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-[20px] lg:aspect-[258/300] lg:rounded-none" />
      <div className="flex flex-col gap-1.5 px-2 lg:px-0">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}
