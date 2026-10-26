import type { Network } from '@/shared/contracts/common'
import { NETWORK_FEES, QUOTE_TTL_MS, type Cart, type CartItem, type Coupon, type QuoteLine } from '@/shared/contracts/commerce'
import { eth } from '@/shared/lib/money'
import { optionalUser } from '@/mocks/domain/auth'
import { db } from '@/mocks/db/store'
import type { CartRecord, QuoteRecord } from '@/mocks/db/types'
import { fail } from '@/mocks/lib/http'
import { randomId } from '@/mocks/lib/random'

export const userCartKey = (userId: string) => `user:${userId}`
export const guestCartKey = (cartId: string) => `guest:${cartId}`

/** Authenticated requests use the user's cart; visitors are identified by the X-Cart-Id header. */
export function resolveCartKey(request: Request): string {
  const user = optionalUser(request)
  if (user) return userCartKey(user.id)
  const cartId = request.headers.get('X-Cart-Id')
  if (!cartId) fail(400, 'VALIDATION_ERROR', 'Identificador do carrinho ausente.')
  return guestCartKey(cartId)
}

export function getCart(key: string): CartRecord {
  const carts = db().carts
  carts[key] ??= { id: randomId('cart'), lines: [], couponCode: null, version: 0, updatedAt: new Date().toISOString() }
  return carts[key]
}

export function touchCart(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = new Date().toISOString()
}

/** Line data resolved against the live catalog; lines whose NFT/edition vanished are skipped. */
function resolveLine(line: CartRecord['lines'][number]) {
  const nft = db().nfts.find((n) => n.id === line.nftId)
  const edition = nft?.editions.find((e) => e.id === line.editionId)
  return nft && edition ? { nft, edition } : null
}

export function maxQuantityFor(available: number, maxPerOrder: number) {
  return Math.min(available, maxPerOrder)
}

export function findCoupon(code: string | null): Coupon | null {
  if (!code) return null
  const coupon = db().coupons.find((c) => c.code === code)
  if (!coupon || Date.parse(coupon.expiresAt) <= Date.now()) return null
  return { code: coupon.code, label: coupon.label, percentOff: coupon.percentOff }
}

export function toCart(cart: CartRecord): Cart {
  const items: CartItem[] = []
  for (const line of cart.lines) {
    const resolved = resolveLine(line)
    if (!resolved) continue
    const { nft, edition } = resolved
    items.push({
      id: line.id,
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      tokenId: nft.tokenId,
      editionLabel: edition.label,
      image: nft.image,
      quantity: line.quantity,
      unitPrice: edition.price,
      lineTotal: eth.times(edition.price, line.quantity),
      available: edition.available,
      maxQuantity: maxQuantityFor(edition.available, edition.maxPerOrder),
    })
  }
  return {
    id: cart.id,
    items,
    coupon: findCoupon(cart.couponCode),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

function latestQuoteFor(cartKey: string): QuoteRecord | null {
  let latest: QuoteRecord | null = null
  for (const quote of Object.values(db().quotes)) {
    if (quote.cartKey === cartKey && (!latest || quote.createdAt > latest.createdAt)) latest = quote
  }
  return latest
}

/** Prices the cart from the live catalog. Lines are compared with the previous quote to flag price changes. */
export function buildQuote(cartKey: string, network: Network): QuoteRecord {
  const cart = getCart(cartKey)
  const previous = latestQuoteFor(cartKey)
  const lines: QuoteLine[] = []

  for (const line of cart.lines) {
    const resolved = resolveLine(line)
    if (!resolved) continue
    const { nft, edition } = resolved
    const previousLine = previous?.lines.find((l) => l.itemId === line.id)
    const priceChanged = previousLine !== undefined && !eth.eq(previousLine.unitPrice, edition.price)
    const status: QuoteLine['status'] =
      edition.available === 0
        ? 'sold_out'
        : line.quantity > edition.available
          ? 'insufficient'
          : priceChanged
            ? 'price_changed'
            : 'ok'
    lines.push({
      itemId: line.id,
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      tokenId: nft.tokenId,
      editionLabel: edition.label,
      image: nft.image,
      quantity: line.quantity,
      unitPrice: edition.price,
      lineTotal: eth.times(edition.price, line.quantity),
      available: edition.available,
      status,
      previousUnitPrice: priceChanged ? previousLine.unitPrice : null,
    })
  }

  const coupon = findCoupon(cart.couponCode)
  const subtotal = eth.sum(lines.map((l) => l.lineTotal))
  const discount = coupon ? eth.percent(subtotal, coupon.percentOff) : '0'
  const networkFee = lines.length > 0 ? NETWORK_FEES[network] : '0'
  const now = Date.now()
  const quote: QuoteRecord = {
    id: randomId('quo'),
    cartKey,
    cartVersion: cart.version,
    network,
    lines,
    coupon,
    subtotal,
    discount,
    networkFee,
    total: eth.add(eth.sub(subtotal, discount), networkFee),
    purchasable: lines.length > 0 && lines.every((l) => l.status === 'ok' || l.status === 'price_changed'),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
  }
  db().quotes[quote.id] = quote
  return quote
}

/** A quote is still valid only if a fresh pricing of the same cart yields the same commercial terms. */
export function sameTerms(a: QuoteRecord, b: QuoteRecord) {
  if (a.cartVersion !== b.cartVersion || a.network !== b.network || a.lines.length !== b.lines.length) return false
  if (a.coupon?.code !== b.coupon?.code || !eth.eq(a.total, b.total) || !eth.eq(a.networkFee, b.networkFee)) return false
  return a.lines.every((line, i) => {
    const other = b.lines[i]
    return (
      other !== undefined &&
      other.itemId === line.itemId &&
      other.quantity === line.quantity &&
      eth.eq(other.unitPrice, line.unitPrice) &&
      other.quantity <= other.available
    )
  })
}
