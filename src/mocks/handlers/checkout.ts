import { HttpResponse, delay } from 'msw'
import { createOrderInputSchema, quoteInputSchema } from '@/shared/contracts/commerce'
import { requireUser } from '@/mocks/domain/auth'
import { touchNft } from '@/mocks/domain/catalog'
import { buildQuote, resolveCartKey, sameTerms, userCartKey } from '@/mocks/domain/cart'
import { publishNftUpdated, snapshotNft } from '@/mocks/domain/events'
import { ORDER_SETTLEMENT_MS, reserveStock, scheduleSettlement } from '@/mocks/domain/orders'
import { toOrder } from '@/mocks/domain/orders-view'
import { db, persist } from '@/mocks/db/store'
import type { OrderRecord, QuoteRecord } from '@/mocks/db/types'
import { fail, parseBody } from '@/mocks/lib/http'
import { randomId } from '@/mocks/lib/random'
import { param, route } from '@/mocks/lib/route'
import { consumeOnce, currentScenario } from '@/mocks/scenarios/state'

/** Delay before the scenario mutates the catalog after the checkout quote is shown. */
const CHECKOUT_CHANGE_DELAY_MS = 1_200
const PRICE_CHANGE_FACTOR = 1.15

function scheduleCheckoutChange(quote: QuoteRecord) {
  const change = currentScenario().onCheckoutQuote
  const firstLine = quote.lines[0]
  if (!change || !firstLine || !consumeOnce(`checkout-${change}`)) return

  setTimeout(() => {
    const nft = db().nfts.find((n) => n.id === firstLine.nftId)
    const edition = nft?.editions.find((e) => e.id === firstLine.editionId)
    if (!nft || !edition) return
    const before = snapshotNft(nft)
    if (change === 'price-change') {
      edition.price = (Math.round(Number(edition.price) * PRICE_CHANGE_FACTOR * 100) / 100).toFixed(2)
    } else {
      edition.available = 0
    }
    touchNft(nft)
    persist()
    publishNftUpdated(nft, before)
  }, CHECKOUT_CHANGE_DELAY_MS)
}

/** Stable fingerprint of the order payload, used to detect Idempotency-Key reuse with other content. */
function fingerprint(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  )
}

export const checkoutHandlers = [
  route('post', '/quote', 'quote.create', async ({ request }) => {
    const cartKey = resolveCartKey(request)
    const input = await parseBody(request, quoteInputSchema)
    const quote = buildQuote(cartKey, input.network)
    if (input.purpose === 'checkout') scheduleCheckoutChange(quote)
    const { cartKey: _cartKey, ...body } = quote
    return HttpResponse.json(body, { status: 201 })
  }),

  route('post', '/orders', 'orders.create', async ({ request }) => {
    const user = requireUser(request)
    const key = request.headers.get('Idempotency-Key')
    if (!key) fail(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key ausente.')
    const input = await parseBody(request, createOrderInputSchema)
    const print = fingerprint(input)
    const idempotencyId = `${user.id}:${key}`

    const previous = db().idempotency[idempotencyId]
    if (previous) {
      if (previous.fingerprint !== print) {
        fail(409, 'IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com outros dados.')
      }
      return HttpResponse.json(toOrder(db().orders[previous.orderId]!))
    }

    // A new attempt (new key) while another order is still settling would be a duplicate purchase.
    const pendingOrder = Object.values(db().orders).find((o) => o.userId === user.id && o.status === 'pending')
    if (pendingOrder) {
      fail(409, 'ORDER_PENDING', 'Você já tem um pedido aguardando confirmação. Acompanhe-o antes de comprar novamente.', {
        details: { orderId: pendingOrder.id },
      })
    }

    const quote = db().quotes[input.quoteId]
    const cartKey = userCartKey(user.id)
    if (!quote || quote.cartKey !== cartKey) fail(404, 'NOT_FOUND', 'Cotação não encontrada. Revise o pedido novamente.')

    const session = db().walletSessions[input.walletSessionId]
    if (!session || session.userId !== user.id || !session.active) {
      fail(409, 'WALLET_DISCONNECTED', 'Conecte sua carteira novamente para concluir a compra.')
    }
    if (session.network !== quote.network) {
      fail(409, 'CONFLICT', 'A rede da carteira conectada é diferente da rede da cotação. Revise o pedido.')
    }

    // Revalidate price, stock, coupon and fees against the live catalog.
    const fresh = buildQuote(cartKey, quote.network)
    const { cartKey: _k, ...freshBody } = fresh
    if (!fresh.purchasable) {
      fail(409, 'OUT_OF_STOCK', 'Um ou mais itens não estão mais disponíveis na quantidade escolhida.', { details: { quote: freshBody } })
    }
    if (Date.parse(quote.expiresAt) <= Date.now() || !sameTerms(quote, fresh)) {
      fail(409, 'QUOTE_STALE', 'Preços ou condições mudaram. Revise e confirme novamente.', { details: { quote: freshBody } })
    }

    const wallet = Object.values(db().wallets[user.id] ?? {}).find((w) => w?.id === session.walletId)
    const now = new Date()
    const scenario = currentScenario()
    const order: OrderRecord = {
      id: randomId('ord'),
      userId: user.id,
      quoteId: quote.id,
      status: 'pending',
      version: 1,
      network: session.network,
      wallet: { provider: session.provider, address: session.address, nickname: wallet?.nickname ?? '' },
      lines: quote.lines.map(({ nftId, editionId, name, tokenId, editionLabel, image, quantity, unitPrice, lineTotal }) => ({
        nftId,
        editionId,
        name,
        tokenId,
        editionLabel,
        image,
        quantity,
        unitPrice,
        lineTotal,
      })),
      coupon: quote.coupon ? { code: quote.coupon.code, label: quote.coupon.label } : null,
      subtotal: quote.subtotal,
      discount: quote.discount,
      networkFee: quote.networkFee,
      total: quote.total,
      transactionHash: null,
      explorerUrl: null,
      failureReason: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      outcome: scenario.orderOutcome ?? 'confirmed',
      settleAt: scenario.orderOutcome === 'hold' ? null : new Date(now.getTime() + ORDER_SETTLEMENT_MS).toISOString(),
    }
    db().orders[order.id] = order
    db().idempotency[idempotencyId] = { orderId: order.id, fingerprint: print }
    reserveStock(order, 'reserve')
    persist()
    scheduleSettlement(order)

    if (scenario.orderTimeoutOnce && consumeOnce('order-timeout')) {
      // The order exists, but the response is lost: only a retry with the same key recovers it.
      await delay('infinite')
    }
    return HttpResponse.json(toOrder(order), { status: 201 })
  }),

  route('get', '/orders/:id', 'orders.get', ({ request, params }) => {
    const user = requireUser(request)
    const order = db().orders[param(params, 'id')]
    if (!order) fail(404, 'NOT_FOUND', 'Pedido não encontrado.')
    // Authenticated, but not the owner: a permission error, with no order data in the body.
    if (order.userId !== user.id) fail(403, 'FORBIDDEN', 'Você não tem permissão para ver este pedido.')
    return HttpResponse.json(toOrder(order))
  }),
]
