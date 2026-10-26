import { z } from 'zod'
import { imageSchema, isoDateSchema, networkSchema, walletProviderSchema } from '@/shared/contracts/common'
import { nftSummarySchema } from '@/shared/contracts/nft'
import { ethAmountSchema } from '@/shared/lib/money'

// ---------------------------------------------------------------------------
// Favorites

export const favoritesResponseSchema = z.object({ items: z.array(nftSummarySchema) })
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>

// ---------------------------------------------------------------------------
// Cart

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  editionLabel: z.string(),
  image: imageSchema,
  quantity: z.number().int().positive(),
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
  /** Units of this edition still available right now. */
  available: z.number().int().min(0),
  /** min(available, maxPerOrder) */
  maxQuantity: z.number().int().min(0),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const couponSchema = z.object({
  code: z.string(),
  label: z.string(),
  percentOff: z.number().positive().max(100),
})
export type Coupon = z.infer<typeof couponSchema>

export const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  coupon: couponSchema.nullable(),
  itemCount: z.number().int().min(0),
  version: z.number().int().min(0),
  updatedAt: isoDateSchema,
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemInputSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().positive(),
})
export type AddCartItemInput = z.infer<typeof addCartItemInputSchema>

export const updateCartItemInputSchema = z.object({ quantity: z.number().int().positive() })

export const applyCouponInputSchema = z.object({
  code: z.string().trim().min(1, 'Informe um código promocional').max(20, 'Código muito longo').toUpperCase(),
})
export type ApplyCouponInput = z.infer<typeof applyCouponInputSchema>

// ---------------------------------------------------------------------------
// Quote: the API's priced snapshot of the cart. It is the reference for totals
// and the only thing an order can be created from.

export const quoteLineStatusSchema = z.enum(['ok', 'price_changed', 'insufficient', 'sold_out'])

export const quoteLineSchema = z.object({
  itemId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  editionLabel: z.string(),
  image: imageSchema,
  quantity: z.number().int().positive(),
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
  available: z.number().int().min(0),
  status: quoteLineStatusSchema,
  previousUnitPrice: ethAmountSchema.nullable(),
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteSchema = z.object({
  id: z.string(),
  cartVersion: z.number().int().min(0),
  network: networkSchema,
  lines: z.array(quoteLineSchema),
  coupon: couponSchema.nullable(),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  /** False when any line has a problem that blocks checkout. */
  purchasable: z.boolean(),
  createdAt: isoDateSchema,
  expiresAt: isoDateSchema,
})
export type Quote = z.infer<typeof quoteSchema>

export const quoteInputSchema = z.object({
  network: networkSchema,
  /** "checkout" marks the review-step quote that an order will be created from. */
  purpose: z.enum(['cart', 'checkout']).default('cart'),
})
export type QuoteInput = z.input<typeof quoteInputSchema>

export const NETWORK_FEES = { ethereum: '0.016', polygon: '0.002', solana: '0.001' } as const
export const QUOTE_TTL_MS = 5 * 60 * 1000

// ---------------------------------------------------------------------------
// Orders

export const ORDER_STATUSES = ['pending', 'confirmed', 'rejected'] as const
export const orderStatusSchema = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const buyerSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome de exibição').max(40, 'Use no máximo 40 caracteres'),
  username: z.string().trim().min(3, 'Informe o nome de usuário').max(24, 'Use no máximo 24 caracteres'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(40, 'Use no máximo 40 caracteres'),
  email: z.email('Informe um e-mail válido'),
  referralCode: z.string().trim().min(4, 'Informe o código de indicação').max(16, 'Use no máximo 16 caracteres'),
  ensName: z.string().trim().min(3, 'Informe o nome ENS').max(32, 'Use no máximo 32 caracteres'),
  ensSuffix: z.string(),
  note: z.string().trim().max(280, 'Use no máximo 280 caracteres'),
})
export type Buyer = z.infer<typeof buyerSchema>

export const createOrderInputSchema = z.object({
  quoteId: z.string(),
  walletSessionId: z.string(),
  buyer: buyerSchema,
})
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

export const orderLineSchema = quoteLineSchema.pick({
  nftId: true,
  editionId: true,
  name: true,
  tokenId: true,
  editionLabel: true,
  image: true,
  quantity: true,
  unitPrice: true,
  lineTotal: true,
})
export type OrderLine = z.infer<typeof orderLineSchema>

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  version: z.number().int().positive(),
  network: networkSchema,
  wallet: z.object({ provider: walletProviderSchema, address: z.string(), nickname: z.string() }),
  lines: z.array(orderLineSchema),
  coupon: z.object({ code: z.string(), label: z.string() }).nullable(),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  transactionHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})
export type Order = z.infer<typeof orderSchema>
