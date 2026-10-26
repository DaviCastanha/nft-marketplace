import type { Order } from '@/shared/contracts/commerce'
import type { OrderRecord } from '@/mocks/db/types'

export function toOrder({ userId: _u, quoteId: _q, settleAt: _s, outcome: _o, ...order }: OrderRecord): Order {
  return order
}
