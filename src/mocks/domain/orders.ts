import { touchNft } from '@/mocks/domain/catalog'
import { getCart, touchCart, userCartKey } from '@/mocks/domain/cart'
import { publishNftUpdated, publishOrderUpdated, snapshotNft } from '@/mocks/domain/events'
import { db, persist } from '@/mocks/db/store'
import type { OrderRecord } from '@/mocks/db/types'
import { randomHex } from '@/mocks/lib/random'

/** Simulated time between submission and the chain "settling" the payment. */
export const ORDER_SETTLEMENT_MS = 1_500

const timers = new Map<string, ReturnType<typeof setTimeout>>()

/** Stock is reserved when the order is created, so concurrent buyers see it immediately. */
export function reserveStock(order: OrderRecord, direction: 'reserve' | 'release') {
  for (const line of order.lines) {
    const nft = db().nfts.find((n) => n.id === line.nftId)
    const edition = nft?.editions.find((e) => e.id === line.editionId)
    if (!nft || !edition) continue
    const before = snapshotNft(nft)
    edition.available = Math.max(0, edition.available + (direction === 'reserve' ? -line.quantity : line.quantity))
    touchNft(nft)
    publishNftUpdated(nft, before)
  }
}

/** Confirmed orders remove exactly the purchased quantities from the buyer's cart. */
function removePurchasedFromCart(order: OrderRecord) {
  const cart = getCart(userCartKey(order.userId))
  for (const purchased of order.lines) {
    const line = cart.lines.find((l) => l.nftId === purchased.nftId && l.editionId === purchased.editionId)
    if (line) line.quantity -= purchased.quantity
  }
  cart.lines = cart.lines.filter((l) => l.quantity > 0)
  if (order.coupon && cart.couponCode === order.coupon.code) cart.couponCode = null
  touchCart(cart)
}

export function settleOrder(orderId: string, status: 'confirmed' | 'rejected') {
  const order = db().orders[orderId]
  if (!order || order.status !== 'pending') return order ?? null
  clearTimeout(timers.get(orderId))
  timers.delete(orderId)

  order.status = status
  order.version += 1
  order.updatedAt = new Date().toISOString()
  order.settleAt = null
  if (status === 'confirmed') {
    order.transactionHash = `0x${randomHex(64)}`
    order.explorerUrl = `/explorer/tx/${order.transactionHash}`
    removePurchasedFromCart(order)
  } else {
    order.failureReason = 'A carteira recusou o pagamento (saldo insuficiente na simulação).'
    reserveStock(order, 'release')
  }
  persist()
  publishOrderUpdated(order)
  return order
}

export function scheduleSettlement(order: OrderRecord) {
  if (order.status !== 'pending' || order.outcome === 'hold' || !order.settleAt) return
  const outcome = order.outcome
  const wait = Math.max(0, Date.parse(order.settleAt) - Date.now())
  timers.set(order.id, setTimeout(() => settleOrder(order.id, outcome), wait))
}

/** After a reload the timers are gone: overdue orders settle now, the rest are rescheduled. */
export function resumePendingOrders() {
  for (const order of Object.values(db().orders)) scheduleSettlement(order)
}
