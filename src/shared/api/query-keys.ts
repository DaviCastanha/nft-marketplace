import type { Network } from '@/shared/contracts/common'
import type { CatalogSearch } from '@/shared/contracts/nft'

/**
 * Query key factory. Public data is keyed by its parameters; everything private
 * lives under ['user', userId, ...] so logout or a user switch can drop it at once.
 */
export const queryKeys = {
  catalog: {
    all: ['catalog'] as const,
    lists: () => ['catalog', 'list'] as const,
    list: (search: CatalogSearch) => ['catalog', 'list', search] as const,
    featured: () => ['catalog', 'featured'] as const,
    details: () => ['catalog', 'detail'] as const,
    detail: (id: string) => ['catalog', 'detail', id] as const,
    related: (id: string) => ['catalog', 'related', id] as const,
  },
  guestCart: (cartId: string) => ['guest', cartId, 'cart'] as const,
  guestQuote: (cartId: string, network: Network) => ['guest', cartId, 'quote', network] as const,
  user: {
    all: ['user'] as const,
    scope: (userId: string) => ['user', userId] as const,
    session: (userId: string) => ['user', userId, 'session'] as const,
    favorites: (userId: string) => ['user', userId, 'favorites'] as const,
    cart: (userId: string) => ['user', userId, 'cart'] as const,
    quote: (userId: string, network: Network) => ['user', userId, 'quote', network] as const,
    profile: (userId: string) => ['user', userId, 'profile'] as const,
    wallets: (userId: string) => ['user', userId, 'wallets'] as const,
    order: (userId: string, orderId: string) => ['user', userId, 'order', orderId] as const,
  },
}
