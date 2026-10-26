import { HttpResponse } from 'msw'
import { z } from 'zod'
import { ethAmountSchema } from '@/shared/lib/money'
import { findEdition, findNft, touchNft } from '@/mocks/domain/catalog'
import { publishNftUpdated, replayLastNftEvent } from '@/mocks/domain/events'
import { settleOrder } from '@/mocks/domain/orders'
import { db, resetDb } from '@/mocks/db/store'
import { fail, noContent, parseBody } from '@/mocks/lib/http'
import { control, param } from '@/mocks/lib/route'
import { disconnectAllClients } from '@/mocks/realtime/server'
import { SCENARIOS } from '@/mocks/scenarios/definitions'
import { currentScenario, resetNetworkState, setScenario } from '@/mocks/scenarios/state'

const stateBody = () => ({
  scenario: currentScenario().id,
  scenarios: SCENARIOS.map(({ id, label, description }) => ({ id, label, description })),
})

const nftChangeSchema = z.object({
  editionId: z.string().optional(),
  price: ethAmountSchema.optional(),
  available: z.number().int().min(0).optional(),
})

/**
 * Mock control plane, used by the dev panel and by Playwright. Data changes go
 * through the same domain functions as the API, so REST and events stay in sync.
 */
export const controlHandlers = [
  control('get', '/state', () => HttpResponse.json(stateBody())),

  control('post', '/reset', async ({ request }) => {
    const { scenario } = await parseBody(request, z.object({ scenario: z.string().optional() }).default({}))
    if (scenario && !setScenario(scenario)) fail(404, 'NOT_FOUND', `Cenário desconhecido: ${scenario}`)
    resetDb()
    resetNetworkState()
    return HttpResponse.json(stateBody())
  }),

  control('put', '/scenario', async ({ request }) => {
    const { id } = await parseBody(request, z.object({ id: z.string() }))
    if (!setScenario(id)) fail(404, 'NOT_FOUND', `Cenário desconhecido: ${id}`)
    return HttpResponse.json(stateBody())
  }),

  control('post', '/sessions/expire', () => {
    const past = new Date(Date.now() - 1_000).toISOString()
    for (const session of db().sessions) session.expiresAt = past
    return noContent()
  }),

  control('post', '/nfts/:id', async ({ request, params }) => {
    const nft = findNft(param(params, 'id'))
    const change = await parseBody(request, nftChangeSchema)
    const edition = findEdition(nft, change.editionId ?? nft.editions.find((e) => e.price === nft.price)?.id ?? nft.editions[0]!.id)
    const previousPrice = nft.price
    if (change.price !== undefined) edition.price = change.price
    if (change.available !== undefined) edition.available = change.available
    touchNft(nft)
    publishNftUpdated(nft, previousPrice)
    return HttpResponse.json({ id: nft.id, version: nft.version, price: nft.price, available: nft.available })
  }),

  control('post', '/orders/:id/resolve', async ({ request, params }) => {
    const { status } = await parseBody(request, z.object({ status: z.enum(['confirmed', 'rejected']) }))
    const order = settleOrder(param(params, 'id'), status)
    if (!order) fail(404, 'NOT_FOUND', 'Pedido não encontrado.')
    return HttpResponse.json({ id: order.id, status: order.status })
  }),

  control('post', '/socket/disconnect', () => {
    disconnectAllClients()
    return noContent()
  }),

  control('post', '/events/replay', async ({ request }) => {
    const { mode } = await parseBody(request, z.object({ mode: z.enum(['duplicate', 'stale']) }))
    if (!replayLastNftEvent(mode)) fail(409, 'CONFLICT', 'Nenhum evento para repetir.')
    return noContent()
  }),
]
