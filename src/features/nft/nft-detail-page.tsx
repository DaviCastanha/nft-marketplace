import { useQuery } from '@tanstack/react-query'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { MobileTopBar } from '@/app/layout/mobile-nav'
import { catalogQueries } from '@/features/catalog/api'
import { useAddToCart } from '@/features/cart/hooks'
import { useFavoriteIds, useToggleFavorite } from '@/features/favorites/api'
import { EditionPicker } from '@/features/nft/components/edition-picker'
import { RatingStars } from '@/features/nft/components/rating'
import { RelatedCarousel } from '@/features/nft/components/related-carousel'
import { CartSmallIcon, HeartFilledIcon, HeartOutlineIcon, LinkedinIcon, MailIcon, StarIcon, TwitterIcon, ZoomIcon } from '@/shared/components/icons'
import { NftImage } from '@/shared/components/nft-image'
import { QuantityStepper } from '@/shared/components/quantity-stepper'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { NETWORK_LABELS } from '@/shared/contracts/common'
import type { Edition, NftDetail, NftSummary } from '@/shared/contracts/nft'
import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'

const route = getRouteApi('/nfts/$nftId')

const TAB_TRIGGER =
  'flex-none px-0 pb-2 text-lg leading-6 font-normal text-foreground hover:text-text-accent data-[state=active]:font-bold data-[state=active]:text-text-accent dark:text-foreground dark:data-[state=active]:border-transparent dark:data-[state=active]:text-text-accent after:bottom-[-1px] after:h-[3px] after:bg-primary'

/**
 * Initial edition: 1/50 (as in the Figma detail) when it has stock, otherwise the
 * cheapest available one. It does not depend on live prices, so a realtime update
 * never silently switches the edition the user is looking at.
 */
function defaultEdition(editions: Edition[]): Edition {
  const preferred = editions.find((e) => e.id === '1-50' && e.available > 0)
  if (preferred) return preferred
  const available = editions.filter((e) => e.available > 0)
  const pool = available.length > 0 ? available : editions
  return pool.reduce((min, e) => (Number(e.price) < Number(min.price) ? e : min))
}

function Breadcrumb() {
  return (
    <nav aria-label="Trilha de navegação" className="hidden text-[15px] leading-4 font-bold lg:block">
      <ol className="flex gap-1.5">
        <li>
          <Link to="/">Início</Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/" hash="mercado" aria-current="page">
            Mercado
          </Link>
        </li>
      </ol>
    </nav>
  )
}

function Gallery({ nft }: { nft: NftDetail }) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  const image = nft.gallery[active] ?? nft.image

  return (
    <div className="flex gap-7">
      <ul className="hidden w-[100px] shrink-0 flex-col gap-4 lg:flex" aria-label="Imagens do NFT">
        {nft.gallery.map((thumb, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Mostrar imagem ${index + 1} de ${nft.gallery.length}`}
              aria-current={index === active ? 'true' : undefined}
              className={cn('block size-[100px] overflow-hidden rounded-lg bg-card', index === active && 'ring-1 ring-primary')}
            >
              <NftImage image={thumb} sizes="100px" alt="" className="size-full" />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative w-full rounded-md bg-card p-4 max-lg:bg-transparent max-lg:p-0 lg:size-[444px] lg:shrink-0">
        <NftImage image={image} sizes="(min-width: 1024px) 404px, 92vw" priority className="w-full rounded-[24px]" />
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label={`Ampliar imagem de ${nft.name}`}
          className="absolute top-[15px] right-[15px] hidden rounded-full lg:block"
        >
          <ZoomIcon className="size-[30px]" />
        </button>
      </div>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-[min(92vw,720px)] p-3">
          <DialogTitle className="sr-only">{nft.name}</DialogTitle>
          <DialogDescription className="sr-only">{image.alt}</DialogDescription>
          <NftImage image={image} sizes="720px" className="w-full rounded-[20px]" />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShareLinks({ nft }: { nft: NftDetail }) {
  const url = typeof window === 'undefined' ? '' : window.location.href
  const text = `${nft.name} na Kurio`
  const links = [
    { label: 'Compartilhar no LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, Icon: LinkedinIcon },
    { label: 'Compartilhar por e-mail', href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`, Icon: MailIcon },
    { label: 'Compartilhar no Twitter', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, Icon: TwitterIcon },
  ]
  return (
    <div className="flex items-center gap-2">
      <span className="text-[15px] leading-4 font-bold">Compartilhar este NFT:</span>
      <ul className="flex items-center gap-2">
        {links.map(({ label, href, Icon }) => (
          <li key={label}>
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (abre em nova aba)`} className="grid size-6 place-items-center rounded-sm">
              <Icon className="h-4 w-4" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFT" className="page-container flex flex-col gap-8 lg:flex-row lg:gap-8 lg:pt-8">
      <div className="flex gap-7">
        <div className="hidden w-[100px] flex-col gap-4 lg:flex">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="size-[100px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="aspect-square w-full rounded-[24px] lg:size-[444px]" />
      </div>
      <div className="flex flex-1 flex-col gap-5">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

function NftNotFound() {
  return (
    <section className="page-container flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-2xl font-bold">NFT não encontrado</h1>
      <p className="max-w-md text-text-secondary">Este NFT não existe ou foi removido do mercado. Confira outras obras disponíveis no catálogo.</p>
      <Button asChild>
        <Link to="/" hash="mercado">
          Explorar o mercado
        </Link>
      </Button>
    </section>
  )
}

export function NftDetailPage() {
  const { nftId } = route.useParams()
  const detail = useQuery(catalogQueries.detail(nftId))
  const related = useQuery(catalogQueries.related(nftId))

  if (detail.isPending) return <DetailSkeleton />
  if (detail.error?.code === 'NOT_FOUND') return <NftNotFound />
  if (detail.error) {
    return (
      <section role="alert" className="page-container flex flex-col items-start gap-4 py-16">
        <h1 className="text-2xl font-bold">Não foi possível carregar este NFT</h1>
        <p className="text-text-secondary">{detail.error.message}</p>
        <Button type="button" onClick={() => void detail.refetch()}>
          Tentar novamente
        </Button>
      </section>
    )
  }

  // Keyed by NFT: the initial edition is chosen once per NFT, never re-derived from live updates.
  return <NftDetailView key={detail.data.id} nft={detail.data} relatedItems={related.data?.items} relatedPending={related.isPending} />
}

function NftDetailView({ nft, relatedItems, relatedPending }: { nft: NftDetail; relatedItems: NftSummary[] | undefined; relatedPending: boolean }) {
  const navigate = useNavigate()
  const favorites = useFavoriteIds()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const [editionId, setEditionId] = useState(() => defaultEdition(nft.editions).id)
  const [quantity, setQuantity] = useState(1)

  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]!
  const maxQuantity = Math.min(edition.available, edition.maxPerOrder)
  // Realtime stock changes can shrink the limit below the chosen quantity.
  const effectiveQuantity = Math.max(1, Math.min(quantity, maxQuantity))
  const unavailable = maxQuantity === 0
  const isFavorite = favorites.has(nft.id)

  const add = (thenGoToCart: boolean) =>
    addToCart.add(
      { nftId: nft.id, editionId: edition.id, quantity: effectiveQuantity, name: nft.name, editionLabel: edition.label },
      { onSuccess: thenGoToCart ? () => void navigate({ to: '/cart' }) : undefined },
    )

  const reviewsLabel = `${nft.reviewsCount} ${nft.reviewsCount === 1 ? 'avaliação' : 'avaliações'} de colecionadores`

  return (
    <div className="flex flex-col gap-12 pb-48 lg:gap-24 lg:pb-0">
      <MobileTopBar
        action={
          <button
            type="button"
            onClick={() => toggleFavorite(nft, !isFavorite)}
            aria-label={`Favoritar ${nft.name}`}
            aria-pressed={isFavorite}
            className="grid size-[35px] place-items-center rounded-full border border-border bg-surface-raised"
          >
            {isFavorite ? <HeartFilledIcon className="size-4 text-primary" /> : <HeartOutlineIcon className="size-4" />}
          </button>
        }
      />

      <div className="page-container flex flex-col gap-3 max-lg:-mt-4 lg:pt-8">
        <Breadcrumb />
        <article aria-labelledby="nft-title" className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <Gallery nft={nft} />

          {/* On phones the info is a sheet that overlaps the artwork (Figma "Details Sheet"). */}
          <div className="relative flex min-w-0 flex-1 flex-col gap-5 max-lg:-mx-4 max-lg:-mt-14 max-lg:rounded-t-[31px] max-lg:bg-card max-lg:px-6 max-lg:pt-8 sm:max-lg:-mx-6">
            <header className="flex flex-col gap-3 border-b-[0.5px] border-primary pb-3 max-lg:border-0 max-lg:pb-0">
              <div className="flex items-center justify-between gap-4">
                <h1 id="nft-title" className="text-xl leading-6 font-bold lg:text-[28px] lg:leading-[37px]">
                  {nft.name}
                </h1>
                <a href="#reviews" className="flex shrink-0 items-center gap-1 rounded-full border border-border-soft px-2 py-1 text-sm lg:hidden">
                  <StarIcon className="size-3.5 text-brand-amber" /> {nft.rating}
                  <span className="text-text-secondary">({nft.reviewsCount})</span>
                  <span className="sr-only">, ver {reviewsLabel}</span>
                </a>
              </div>
              <div className="hidden items-center justify-between lg:flex">
                <p className="text-[22px] leading-4 font-bold text-text-accent">
                  <span className="sr-only">Preço da edição {edition.label}: </span>
                  {formatEth(edition.price)}
                </p>
                <a href="#reviews" className="flex items-center gap-1 text-[15px] leading-5">
                  <RatingStars rating={nft.rating} />
                  <span>
                    <span className="sr-only">Nota {nft.rating} de 5, </span>
                    {reviewsLabel}
                  </span>
                </a>
              </div>
            </header>

            <section className="flex flex-col gap-3">
              <h2 className="hidden text-[15px] leading-4 font-bold lg:block">Sobre este NFT:</h2>
              <p className="text-sm leading-6 text-text-secondary">{nft.description}</p>
            </section>

            <EditionPicker
              editions={nft.editions}
              value={edition.id}
              onChange={(id) => {
                setEditionId(id)
                setQuantity(1)
              }}
            />

            {/* Desktop purchase row. */}
            <div className="hidden items-start justify-between gap-4 lg:flex">
              <QuantityStepper variant="pill" value={effectiveQuantity} max={maxQuantity} onChange={setQuantity} label={nft.name} disabled={unavailable} />
              <div className="flex gap-2">
                <Button type="button" className="w-[130px] rounded-md" onClick={() => add(true)} disabled={unavailable || addToCart.isPending}>
                  COMPRAR
                </Button>
                <Button type="button" variant="outline" className="w-[130px] gap-2 rounded-md font-medium" onClick={() => toggleFavorite(nft, !isFavorite)} aria-pressed={isFavorite}>
                  {isFavorite ? <HeartFilledIcon className="size-5 text-primary" /> : <HeartOutlineIcon className="size-5 text-primary" />}
                  Favoritar
                </Button>
              </div>
            </div>
            {unavailable && (
              <p role="status" className="text-sm text-coral">
                A edição {edition.label} está esgotada. Escolha outra edição.
              </p>
            )}

            <dl className="flex flex-col gap-3 text-[15px] leading-5 text-text-tertiary">
              <div className="flex gap-1">
                <dt>ID do token:</dt>
                <dd>{nft.tokenId}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Coleção:</dt>
                <dd>{nft.collection}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Atributos:</dt>
                <dd>{nft.attributes.join(', ')}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Disponíveis:</dt>
                <dd>{edition.kind === 'open' ? 'edição aberta' : `${edition.available} de ${edition.supply}`}</dd>
              </div>
            </dl>
            <div className="hidden lg:block">
              <ShareLinks nft={nft} />
            </div>
          </div>
        </article>
      </div>

      <section aria-label="Informações do NFT" className="page-container">
        <Tabs defaultValue="details" className="gap-0">
          <TabsList variant="line" className="h-auto w-full justify-start gap-8 overflow-x-auto border-b-[0.5px] border-primary p-0 group-data-[orientation=horizontal]/tabs:h-auto">
            <TabsTrigger value="details" className={TAB_TRIGGER}>
              Detalhes do NFT
            </TabsTrigger>
            <TabsTrigger value="reviews" id="reviews" className={TAB_TRIGGER}>
              Avaliações de colecionadores ({nft.reviewsCount})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="flex flex-col gap-3 pt-3 text-sm leading-6">
            {nft.story.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="text-text-secondary">
                {paragraph}
              </p>
            ))}
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="font-bold">Rede:</dt>
                <dd className="text-text-secondary">{nft.networkNote}</dd>
              </div>
              <div>
                <dt className="font-bold">Contrato:</dt>
                <dd className="text-text-secondary">
                  {nft.contractAddress} • Contrato inteligente {nft.contractStandard} verificado na {NETWORK_LABELS[nft.network]}.
                </dd>
              </div>
              <div>
                <dt className="font-bold">Direitos autorais:</dt>
                <dd className="text-text-secondary">
                  Direitos autorais do criador: {nft.royaltiesPct}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.
                </dd>
              </div>
            </dl>
          </TabsContent>
          <TabsContent value="reviews" className="pt-3">
            {nft.reviews.length === 0 ? (
              <p className="text-sm text-text-secondary">Este NFT ainda não recebeu avaliações.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {nft.reviews.map((review) => (
                  <li key={review.id} className="flex flex-col gap-1 py-4">
                    <p className="flex items-center gap-2 text-sm font-bold">
                      {review.author}
                      <RatingStars rating={review.rating} />
                      <span className="sr-only">nota {review.rating} de 5</span>
                    </p>
                    <p className="text-sm text-text-secondary">{review.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <RelatedCarousel title="Mais desta coleção" items={relatedItems} isPending={relatedPending} />

      {/* Mobile buy bar (Figma "Buy Bar"). */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-5 rounded-t-[40px] bg-card px-6 pt-5 pb-[max(env(safe-area-inset-bottom),24px)] shadow-[0_0_20px_0_#0a060473] lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium">Qtd.</span>
            <QuantityStepper value={effectiveQuantity} max={maxQuantity} onChange={setQuantity} label={nft.name} disabled={unavailable} />
          </div>
          <p className="text-xl leading-4 font-bold text-text-accent">{formatEth(edition.price)}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => add(true)}
            disabled={unavailable || addToCart.isPending}
            className="h-[60px] flex-1 rounded-[40px] bg-gradient-to-b from-primary/80 to-primary text-base font-bold text-ink disabled:opacity-50"
          >
            Comprar NFT
          </button>
          <button
            type="button"
            onClick={() => add(false)}
            disabled={unavailable || addToCart.isPending}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            className="grid size-[60px] place-items-center rounded-[40px] border border-border bg-surface-raised text-text-tertiary disabled:opacity-50"
          >
            <CartSmallIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
