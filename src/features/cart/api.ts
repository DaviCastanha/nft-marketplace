import { queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import { request } from '@/shared/api/request'
import type { Network } from '@/shared/contracts/common'
import { cartSchema, quoteSchema, type AddCartItemInput, type QuoteInput } from '@/shared/contracts/commerce'
import { getCartId } from '@/shared/lib/cart-id'

/** The cart belongs either to the signed-in user or to the visitor identified by X-Cart-Id. */
export function cartQueryKey(userId: string | null) {
  return userId ? queryKeys.user.cart(userId) : queryKeys.guestCart(getCartId())
}

export function quoteQueryKey(userId: string | null, network: Network) {
  return userId ? queryKeys.user.quote(userId, network) : queryKeys.guestQuote(getCartId(), network)
}

export const cartApi = {
  get: (signal?: AbortSignal) => request('get', '/cart', cartSchema, { signal }),
  add: (input: AddCartItemInput) => request('post', '/cart/items', cartSchema, { data: input }),
  update: (itemId: string, quantity: number) => request('patch', `/cart/items/${itemId}`, cartSchema, { data: { quantity } }),
  remove: (itemId: string) => request('delete', `/cart/items/${itemId}`, cartSchema),
  applyCoupon: (code: string) => request('post', '/cart/coupon', cartSchema, { data: { code } }),
  removeCoupon: () => request('delete', '/cart/coupon', cartSchema),
  quote: (input: QuoteInput, signal?: AbortSignal) => request('post', '/quote', quoteSchema, { data: input, signal }),
}

export const cartQueries = {
  cart: (userId: string | null) =>
    queryOptions({
      queryKey: cartQueryKey(userId),
      queryFn: ({ signal }) => cartApi.get(signal),
      staleTime: 0,
      refetchOnWindowFocus: true,
    }),
  quote: (userId: string | null, network: Network, cartVersion: number) =>
    queryOptions({
      // Keyed by cart version: any cart change produces a new quote from the API.
      queryKey: [...quoteQueryKey(userId, network), cartVersion] as const,
      queryFn: ({ signal }) => cartApi.quote({ network, purpose: 'cart' }, signal),
      staleTime: 0,
      refetchOnWindowFocus: true,
    }),
}
