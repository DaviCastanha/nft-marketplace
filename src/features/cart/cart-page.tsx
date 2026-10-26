import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { MobileTopBar } from '@/app/layout/mobile-nav'
import { cartQueries } from '@/features/cart/api'
import { CouponForm } from '@/features/cart/components/coupon-form'
import { PriceSummary } from '@/features/cart/components/price-summary'
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/features/cart/hooks'
import { lineNotice } from '@/features/cart/line-notice'
import { catalogQueries } from '@/features/catalog/api'
import { RelatedCarousel } from '@/features/nft/components/related-carousel'
import { announce } from '@/shared/a11y/announcer'
import { TrashIcon } from '@/shared/components/icons'
import { NftImage } from '@/shared/components/nft-image'
import { QuantityStepper } from '@/shared/components/quantity-stepper'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { CartItem, QuoteLine } from '@/shared/contracts/commerce'
import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { useCurrentUser } from '@/shared/session/session-store'

const POPULAR = { sort: 'popular' } as const

function CartLine({ item, line }: { item: CartItem; line: QuoteLine | undefined }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const busy = update.isPending || remove.isPending
  const notice = lineNotice(item, line)
  const blocking = item.available === 0 || item.quantity > item.available

  const changeQuantity = (quantity: number) =>
    update.mutate(
      { itemId: item.id, quantity },
      {
        onSuccess: () => announce(`Quantidade de ${item.name} alterada para ${quantity}.`),
        onError: (error) => toast.error(error.message),
      },
    )

  return (
    <li className="flex flex-col gap-2">
      <article
        aria-label={item.name}
        className="relative grid grid-cols-[100px_1fr] items-center gap-x-3 overflow-hidden rounded-[10px] bg-card pr-3 lg:h-[70px] lg:grid-cols-[311px_139px_136px_148px_24px] lg:gap-x-0 lg:rounded-none lg:pr-6"
      >
        <div className="flex items-center gap-4 max-lg:contents">
          <NftImage image={item.image} sizes="100px" alt="" className="size-[100px] rounded-l-[10px] lg:size-[70px] lg:rounded-none" />
          <div className="flex min-w-0 flex-col gap-1 py-3 lg:py-0">
            <h3 className="flex items-baseline gap-2 text-base leading-5 font-bold">
              <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="truncate hover:text-text-accent">
                {item.name}
              </Link>
              <span className="shrink-0 rounded-full border border-border px-1.5 text-xs leading-4 font-normal text-text-secondary max-lg:hidden">
                <span className="sr-only">Edição </span>
                {item.editionLabel}
              </span>
            </h3>
            <p className="text-sm leading-4 text-text-tertiary">
              <span className="lg:hidden">Edição: {item.editionLabel}</span>
              <span className="max-lg:hidden">ID do token: {item.tokenId}</span>
            </p>
            {/* Mobile: line total and stepper inside the card. */}
            <div className="mt-1 flex items-center justify-between gap-2 lg:hidden">
              <p className="text-lg font-bold text-text-accent">{formatEth(item.lineTotal)}</p>
              <QuantityStepper value={item.quantity} max={Math.max(item.maxQuantity, item.quantity)} onChange={changeQuantity} label={item.name} disabled={busy} />
            </div>
          </div>
        </div>
        <p className="text-lg text-text-accent max-lg:hidden">
          <span className="sr-only">Preço unitário: </span>
          {formatEth(item.unitPrice)}
        </p>
        <div className="max-lg:hidden">
          <QuantityStepper value={item.quantity} max={Math.max(item.maxQuantity, item.quantity)} onChange={changeQuantity} label={item.name} disabled={busy} />
        </div>
        <p className="text-lg font-bold text-text-accent max-lg:hidden">
          <span className="sr-only">Total do item: </span>
          {formatEth(item.lineTotal)}
        </p>
        <button
          type="button"
          onClick={() =>
            remove.mutate(
              { itemId: item.id },
              { onSuccess: () => announce(`${item.name} removido do carrinho.`), onError: (error) => toast.error(error.message) },
            )
          }
          disabled={busy}
          aria-label={`Remover ${item.name} do carrinho`}
          className="grid size-7 place-items-center rounded-sm text-text-tertiary hover:text-coral max-lg:absolute max-lg:top-2 max-lg:right-2"
        >
          <TrashIcon className="size-5" />
        </button>
      </article>
      {notice && (
        <p role="status" className={cn('flex items-center gap-2 text-sm', blocking ? 'text-coral' : 'text-text-accent')}>
          <span aria-hidden="true">{blocking ? '⚠' : 'ⓘ'}</span>
          {notice}
        </p>
      )}
    </li>
  )
}

function CartSkeleton() {
  return (
    <div role="status" aria-label="Carregando carrinho" className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[100px] rounded-[10px] lg:h-[70px] lg:rounded-none" />
      ))}
    </div>
  )
}

export function CartPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const cart = useCart()
  const quote = useQuery({
    ...cartQueries.quote(user?.id ?? null, 'ethereum', cart.data?.version ?? -1),
    enabled: Boolean(cart.data && cart.data.items.length > 0),
  })
  const popular = useQuery(catalogQueries.list(POPULAR))
  const items = cart.data?.items ?? []
  const blocked = items.some((item) => item.available === 0 || item.quantity > item.available)
  const canCheckout = items.length > 0 && !blocked && quote.data?.purchasable === true

  return (
    <div className="flex flex-col gap-12 lg:gap-24">
      <MobileTopBar title="Carrinho de NFTs" />
      <section aria-labelledby="cart-title" className="page-container flex flex-col gap-3 lg:pt-8">
        <nav aria-label="Trilha de navegação" className="hidden text-[15px] leading-4 font-bold lg:block">
          <ol className="flex gap-1.5">
            <li>
              <Link to="/">Início</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/" hash="mercado">
                Mercado
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Carrinho</li>
          </ol>
        </nav>
        <h1 id="cart-title" className="sr-only">
          Carrinho de NFTs
        </h1>

        {cart.isPending ? (
          <CartSkeleton />
        ) : cart.error ? (
          <div role="alert" className="flex flex-col items-start gap-4 bg-card p-8">
            <p>{cart.error.message}</p>
            <Button type="button" onClick={() => void cart.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-start gap-4 bg-card p-8">
            <h2 className="text-lg font-bold">Seu carrinho está vazio</h2>
            <p className="text-text-secondary">Explore o mercado e adicione NFTs para continuar.</p>
            <Button asChild>
              <Link to="/" hash="mercado">
                Explorar o mercado
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div className="flex flex-col gap-3 lg:w-[782px]">
              <div aria-hidden="true" className="hidden grid-cols-[311px_139px_136px_148px_24px] border-b-[0.5px] border-primary pb-3 text-lg leading-4 font-bold lg:grid">
                <span>NFTs</span>
                <span>Preço</span>
                <span>Edições</span>
                <span>Total</span>
              </div>
              <ul className="flex flex-col gap-5 lg:gap-3" aria-label="Itens do carrinho">
                {items.map((item) => (
                  <CartLine key={item.id} item={item} line={quote.data?.lines.find((l) => l.itemId === item.id)} />
                ))}
              </ul>
            </div>

            <aside
              aria-labelledby="summary-title"
              // Phones: bottom sheet that sticks while the item list scrolls, without ever covering items.
              className="flex flex-col gap-6 max-lg:sticky max-lg:bottom-0 max-lg:z-30 max-lg:-mx-4 max-lg:rounded-t-[40px] max-lg:bg-card max-lg:px-6 max-lg:pt-6 max-lg:pb-[max(env(safe-area-inset-bottom),24px)] max-lg:shadow-card sm:max-lg:-mx-6 lg:w-[332px]"
            >
              <h2 id="summary-title" className="border-b-[0.5px] border-primary pb-3 text-lg leading-4 font-bold max-lg:sr-only">
                Resumo da carteira
              </h2>
              <CouponForm coupon={cart.data.coupon} />
              <div aria-live="polite" aria-busy={quote.isFetching}>
                <PriceSummary quote={quote.data} isPending={quote.isPending} />
              </div>
              {quote.error && (
                <p role="alert" className="text-sm text-coral">
                  Não foi possível calcular o resumo.{' '}
                  <button type="button" className="underline" onClick={() => void quote.refetch()}>
                    Tentar novamente
                  </button>
                </p>
              )}
              <div className="flex flex-col items-center gap-3">
                <Button
                  type="button"
                  className="w-full font-medium max-lg:h-[60px] max-lg:rounded-[40px] max-lg:text-base"
                  disabled={!canCheckout}
                  onClick={() => void navigate({ to: '/checkout' })}
                >
                  Conectar e finalizar
                </Button>
                {blocked && <p className="text-center text-sm text-coral">Resolva os itens indisponíveis para finalizar.</p>}
                <Link to="/" hash="mercado" className="text-[15px] text-text-accent max-lg:hidden">
                  Continuar explorando
                </Link>
              </div>
            </aside>
          </div>
        )}
      </section>

      <div className="max-lg:hidden">
        <RelatedCarousel title="Colecionadores também viram" items={popular.data?.items.slice(0, 8)} isPending={popular.isPending} />
      </div>
    </div>
  )
}
