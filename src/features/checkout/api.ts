import { queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import { request } from '@/shared/api/request'
import type { Network } from '@/shared/contracts/common'
import { orderSchema, quoteSchema, type CreateOrderInput } from '@/shared/contracts/commerce'

export const checkoutApi = {
  /** Review-step quote: the API reprices the cart and this is what an order is created from. */
  quote: (network: Network, signal?: AbortSignal) => request('post', '/quote', quoteSchema, { data: { network, purpose: 'checkout' }, signal }),
  createOrder: (input: CreateOrderInput, idempotencyKey: string) =>
    request('post', '/orders', orderSchema, { data: input, headers: { 'Idempotency-Key': idempotencyKey } }),
  order: (orderId: string, signal?: AbortSignal) => request('get', `/orders/${encodeURIComponent(orderId)}`, orderSchema, { signal }),
}

export const orderQueries = {
  detail: (userId: string, orderId: string) =>
    queryOptions({
      queryKey: queryKeys.user.order(userId, orderId),
      queryFn: ({ signal }) => checkoutApi.order(orderId, signal),
    }),
}
