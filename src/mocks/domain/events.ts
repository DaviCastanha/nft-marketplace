import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/shared/contracts/events'
import { toOrder } from '@/mocks/domain/orders-view'
import { userIdForToken } from '@/mocks/domain/auth'
import type { NftRecord, OrderRecord } from '@/mocks/db/types'
import { randomId } from '@/mocks/lib/random'
import { emitToClients } from '@/mocks/realtime/server'

let lastNftEvent: NftUpdatedEvent | null = null

export interface NftSnapshot {
  price: string
  editions: Array<{ id: string; price: string; available: number }>
}

/** Captures an NFT's commercial state before a mutation, so the event can describe what changed. */
export function snapshotNft(nft: NftRecord): NftSnapshot {
  return { price: nft.price, editions: nft.editions.map(({ id, price, available }) => ({ id, price, available })) }
}

/** Every catalog mutation goes through here, so REST state and realtime events never diverge. */
export function publishNftUpdated(nft: NftRecord, before: NftSnapshot) {
  const changes = nft.editions.flatMap((edition) => {
    const previous = before.editions.find((e) => e.id === edition.id)
    if (!previous || (previous.price === edition.price && previous.available === edition.available)) return []
    return [
      {
        editionId: edition.id,
        label: edition.label,
        previousPrice: previous.price,
        price: edition.price,
        previousAvailable: previous.available,
        available: edition.available,
      },
    ]
  })
  const event: NftUpdatedEvent = {
    eventId: randomId('evt'),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    payload: {
      name: nft.name,
      price: nft.price,
      previousPrice: before.price,
      available: nft.available,
      editions: nft.editions.map(({ id, price, available }) => ({ id, price, available })),
      changes,
    },
  }
  lastNftEvent = event
  emitToClients(event.type, event)
}

/** Order events only reach sockets authenticated as the order owner. */
export function publishOrderUpdated(order: OrderRecord) {
  const event: OrderUpdatedEvent = {
    eventId: randomId('evt'),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    payload: { order: toOrder(order) },
  }
  emitToClients(event.type, event, (token) => userIdForToken(token) === order.userId)
}

/** Test hook: re-delivers the last nft.updated as an exact duplicate or as a stale (older) version. */
export function replayLastNftEvent(mode: 'duplicate' | 'stale'): boolean {
  if (!lastNftEvent) return false
  const event: NftUpdatedEvent =
    mode === 'duplicate'
      ? lastNftEvent
      : {
          ...lastNftEvent,
          eventId: randomId('evt'),
          version: Math.max(1, lastNftEvent.version - 1),
          payload: {
            ...lastNftEvent.payload,
            price: lastNftEvent.payload.previousPrice,
            editions: lastNftEvent.payload.editions.map((edition) => {
              const change = lastNftEvent!.payload.changes.find((c) => c.editionId === edition.id)
              return change ? { ...edition, price: change.previousPrice, available: change.previousAvailable } : edition
            }),
          },
        }
  emitToClients(event.type, event)
  return true
}
