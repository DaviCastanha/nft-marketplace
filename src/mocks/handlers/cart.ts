import { HttpResponse } from 'msw'
import { addCartItemInputSchema, applyCouponInputSchema, updateCartItemInputSchema } from '@/shared/contracts/commerce'
import { requireUser } from '@/mocks/domain/auth'
import { findEdition, findNft } from '@/mocks/domain/catalog'
import {
  getCart,
  guestCartKey,
  maxQuantityFor,
  resolveCartKey,
  toCart,
  touchCart,
  userCartKey,
} from '@/mocks/domain/cart'
import { db } from '@/mocks/db/store'
import type { CartRecord } from '@/mocks/db/types'
import { fail, parseBody } from '@/mocks/lib/http'
import { randomId } from '@/mocks/lib/random'
import { param, route } from '@/mocks/lib/route'

function assertQuantity(nftId: string, editionId: string, quantity: number) {
  const edition = findEdition(findNft(nftId), editionId)
  if (edition.available === 0) {
    fail(409, 'EDITION_UNAVAILABLE', `A edição ${edition.label} está esgotada.`)
  }
  const max = maxQuantityFor(edition.available, edition.maxPerOrder)
  if (quantity > max) {
    fail(409, 'QUANTITY_LIMIT', `Máximo de ${max} ${max === 1 ? 'unidade' : 'unidades'} da edição ${edition.label} por pedido.`, {
      details: { max },
    })
  }
}

function findLine(cart: CartRecord, itemId: string) {
  const line = cart.lines.find((l) => l.id === itemId)
  if (!line) fail(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
  return line
}

export const cartHandlers = [
  route('get', '/cart', 'cart.get', ({ request }) => HttpResponse.json(toCart(getCart(resolveCartKey(request))))),

  route('post', '/cart/items', 'cart.mutate', async ({ request }) => {
    const cart = getCart(resolveCartKey(request))
    const input = await parseBody(request, addCartItemInputSchema)
    const existing = cart.lines.find((l) => l.nftId === input.nftId && l.editionId === input.editionId)
    const quantity = (existing?.quantity ?? 0) + input.quantity
    assertQuantity(input.nftId, input.editionId, quantity)
    if (existing) existing.quantity = quantity
    else cart.lines.push({ id: randomId('item'), nftId: input.nftId, editionId: input.editionId, quantity })
    touchCart(cart)
    return HttpResponse.json(toCart(cart), { status: 201 })
  }),

  route('patch', '/cart/items/:itemId', 'cart.mutate', async ({ request, params }) => {
    const cart = getCart(resolveCartKey(request))
    const line = findLine(cart, param(params, 'itemId'))
    const { quantity } = await parseBody(request, updateCartItemInputSchema)
    // Lowering a quantity is always allowed, even if stock dropped below it in the meantime.
    if (quantity > line.quantity) assertQuantity(line.nftId, line.editionId, quantity)
    line.quantity = quantity
    touchCart(cart)
    return HttpResponse.json(toCart(cart))
  }),

  route('delete', '/cart/items/:itemId', 'cart.mutate', ({ request, params }) => {
    const cart = getCart(resolveCartKey(request))
    const line = findLine(cart, param(params, 'itemId'))
    cart.lines = cart.lines.filter((l) => l !== line)
    touchCart(cart)
    return HttpResponse.json(toCart(cart))
  }),

  route('post', '/cart/coupon', 'cart.coupon', async ({ request }) => {
    const cart = getCart(resolveCartKey(request))
    const { code } = await parseBody(request, applyCouponInputSchema)
    const coupon = db().coupons.find((c) => c.code === code)
    if (!coupon) fail(422, 'COUPON_INVALID', 'Código promocional inválido.', { fields: { code: 'Código promocional inválido.' } })
    if (Date.parse(coupon.expiresAt) <= Date.now()) {
      fail(422, 'COUPON_EXPIRED', 'Este código promocional expirou.', { fields: { code: 'Este código promocional expirou.' } })
    }
    cart.couponCode = coupon.code
    touchCart(cart)
    return HttpResponse.json(toCart(cart))
  }),

  route('delete', '/cart/coupon', 'cart.coupon', ({ request }) => {
    const cart = getCart(resolveCartKey(request))
    cart.couponCode = null
    touchCart(cart)
    return HttpResponse.json(toCart(cart))
  }),

  /** Moves the visitor cart (X-Cart-Id) into the user's cart after authentication. */
  route('post', '/cart/merge', 'cart.merge', ({ request }) => {
    const user = requireUser(request)
    const cart = getCart(userCartKey(user.id))
    const guestId = request.headers.get('X-Cart-Id')
    const guest = guestId ? db().carts[guestCartKey(guestId)] : undefined

    if (guest && guest.lines.length > 0) {
      for (const guestLine of guest.lines) {
        const nft = db().nfts.find((n) => n.id === guestLine.nftId)
        const edition = nft?.editions.find((e) => e.id === guestLine.editionId)
        if (!edition) continue
        const max = maxQuantityFor(edition.available, edition.maxPerOrder)
        const existing = cart.lines.find((l) => l.nftId === guestLine.nftId && l.editionId === guestLine.editionId)
        if (existing) existing.quantity = Math.max(1, Math.min(existing.quantity + guestLine.quantity, max))
        else if (max > 0) cart.lines.push({ ...guestLine, id: randomId('item'), quantity: Math.min(guestLine.quantity, max) })
      }
      cart.couponCode ??= guest.couponCode
      touchCart(cart)
    }
    if (guestId) delete db().carts[guestCartKey(guestId)]
    return HttpResponse.json(toCart(cart))
  }),
]
