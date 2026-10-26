import { z } from 'zod'
import { isoDateSchema } from '@/shared/contracts/common'
import { orderSchema } from '@/shared/contracts/commerce'
import { ethAmountSchema } from '@/shared/lib/money'

/** Envelope shared by every realtime event: stable identity, affected resource and version. */
const envelope = <TType extends string, TResource extends string, TPayload extends z.ZodType>(
  type: TType,
  resource: TResource,
  payload: TPayload,
) =>
  z.object({
    eventId: z.string(),
    type: z.literal(type),
    resource: z.object({ type: z.literal(resource), id: z.string() }),
    version: z.number().int().positive(),
    occurredAt: isoDateSchema,
    payload,
  })

export const nftUpdatedEventSchema = envelope(
  'nft.updated',
  'nft',
  z.object({
    name: z.string(),
    price: ethAmountSchema,
    previousPrice: ethAmountSchema,
    available: z.number().int().min(0),
    editions: z.array(
      z.object({ id: z.string(), price: ethAmountSchema, available: z.number().int().min(0) }),
    ),
  }),
)
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = envelope('order.updated', 'order', z.object({ order: orderSchema }))
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const REALTIME_EVENTS = ['nft.updated', 'order.updated'] as const
export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
