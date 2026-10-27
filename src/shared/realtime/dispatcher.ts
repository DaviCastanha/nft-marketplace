import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { announce } from '@/shared/a11y/announcer'
import { queryKeys } from '@/shared/api/query-keys'
import type { Cart, FavoritesResponse, Order } from '@/shared/contracts/commerce'
import { nftUpdatedEventSchema, orderUpdatedEventSchema, type NftUpdatedEvent, type OrderUpdatedEvent } from '@/shared/contracts/events'
import type { FeaturedResponse, NftDetail, NftListResponse, NftSummary } from '@/shared/contracts/nft'
import { formatEth } from '@/shared/lib/money'

const SEEN_LIMIT = 500

/** Human-readable summary of what an nft.updated changed (first changed edition wins). */
function describeNftChange({ payload }: NftUpdatedEvent): string {
  const { name, changes } = payload
  const priceChange = changes.find((c) => c.price !== c.previousPrice)
  if (priceChange) {
    return `O preço de ${name} (edição ${priceChange.label}) mudou de ${formatEth(priceChange.previousPrice)} para ${formatEth(priceChange.price)}.`
  }
  const soldOut = changes.find((c) => c.available === 0 && c.previousAvailable > 0)
  if (soldOut) return `A edição ${soldOut.label} de ${name} esgotou.`
  const stock = changes[0]
  if (stock) return `A disponibilidade da edição ${stock.label} de ${name} mudou para ${stock.available}.`
  return `${name} foi atualizado.`
}

/**
 * Applies realtime events to the Query cache. Events are idempotent: duplicates
 * (same eventId) and stale ones (version not newer than what we hold) are dropped,
 * so a late or repeated delivery never regresses state or re-runs side effects.
 */
export function createDispatcher(queryClient: QueryClient, sessionUserId: string | null) {
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  const accept = (event: { eventId: string; resource: { type: string; id: string }; version: number }, cachedVersion?: number) => {
    if (seen.has(event.eventId)) return false
    seen.add(event.eventId)
    if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value!)
    const key = `${event.resource.type}:${event.resource.id}`
    const known = Math.max(versions.get(key) ?? 0, cachedVersion ?? 0)
    if (event.version <= known) return false
    versions.set(key, event.version)
    return true
  }

  const patchSummary = <T extends NftSummary>(nft: T, event: NftUpdatedEvent): T =>
    nft.id === event.resource.id && event.version > nft.version
      ? { ...nft, price: event.payload.price, available: event.payload.available, version: event.version }
      : nft

  function onNftUpdated(raw: unknown) {
    const parsed = nftUpdatedEventSchema.safeParse(raw)
    if (!parsed.success) return
    const event = parsed.data
    const nftId = event.resource.id
    const cachedDetail = queryClient.getQueryData<NftDetail>(queryKeys.catalog.detail(nftId))
    if (!accept(event, cachedDetail?.version)) return

    queryClient.setQueryData<NftDetail>(queryKeys.catalog.detail(nftId), (detail) =>
      detail
        ? {
            ...patchSummary(detail, event),
            editions: detail.editions.map((edition) => {
              const next = event.payload.editions.find((e) => e.id === edition.id)
              return next ? { ...edition, price: next.price, available: next.available } : edition
            }),
          }
        : detail,
    )
    queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.catalog.lists() }, (list) =>
      list ? { ...list, items: list.items.map((nft) => patchSummary(nft, event)) } : list,
    )
    queryClient.setQueriesData<{ items: NftSummary[] }>({ queryKey: ['catalog', 'related'] }, (related) =>
      related ? { items: related.items.map((nft) => patchSummary(nft, event)) } : related,
    )
    queryClient.setQueryData<FeaturedResponse>(queryKeys.catalog.featured(), (featured) =>
      featured ? { hero: featured.hero.map((n) => patchSummary(n, event)), spotlight: patchSummary(featured.spotlight, event) } : featured,
    )
    if (sessionUserId) {
      queryClient.setQueryData<FavoritesResponse>(queryKeys.user.favorites(sessionUserId), (favorites) =>
        favorites ? { items: favorites.items.map((nft) => patchSummary(nft, event)) } : favorites,
      )
    }

    // Prices and stock in the cart come from the API: refetch the cart and every quote.
    const carts = queryClient.getQueriesData<Cart>({ predicate: (q) => q.queryKey.includes('cart') })
    const inCart = carts.some(([, cart]) => cart?.items.some((item) => item.nftId === nftId))
    void queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes('cart') || q.queryKey.includes('quote') })

    const message = describeNftChange(event)
    // Interrupt (toast) only for what affects a purchase decision in the cart: a new price or a
    // sold-out edition. Plain stock movements (e.g. the user's own order reserving units) are
    // still announced politely.
    const decisive = event.payload.changes.some((c) => c.price !== c.previousPrice || (c.available === 0 && c.previousAvailable > 0))
    if (inCart && decisive) toast.info(message, { id: `nft-${nftId}` })
    announce(message)
  }

  function onOrderUpdated(raw: unknown) {
    const parsed = orderUpdatedEventSchema.safeParse(raw)
    if (!parsed.success || !sessionUserId) return
    const event: OrderUpdatedEvent = parsed.data
    const key = queryKeys.user.order(sessionUserId, event.resource.id)
    const cached = queryClient.getQueryData<Order>(key)
    if (!accept(event, cached?.version)) return

    queryClient.setQueryData<Order>(key, event.payload.order)
    if (event.payload.order.status === 'confirmed') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.cart(sessionUserId) })
    }
  }

  return { onNftUpdated, onOrderUpdated }
}
