import type { User, Wallet, WalletSession } from '@/shared/contracts/account'
import type { Order, Quote } from '@/shared/contracts/commerce'
import type { NftDetail } from '@/shared/contracts/nft'
import type { PasswordHash } from '@/mocks/lib/password'

export interface NftRecord extends NftDetail {
  popularity: number
}

export interface UserRecord extends User {
  password: PasswordHash
  createdAt: string
}

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: string
}

export interface CartLineRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
}

export interface CartRecord {
  id: string
  lines: CartLineRecord[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface QuoteRecord extends Quote {
  cartKey: string
}

export interface OrderRecord extends Order {
  userId: string
  quoteId: string
  /** When the simulated settlement happens; null while held by the scenario. */
  settleAt: string | null
  outcome: 'confirmed' | 'rejected' | 'hold'
}

export interface IdempotencyRecord {
  orderId: string
  fingerprint: string
}

export interface CouponRecord {
  code: string
  label: string
  percentOff: number
  expiresAt: string
}

export interface DbState {
  schemaVersion: number
  nfts: NftRecord[]
  users: UserRecord[]
  sessions: SessionRecord[]
  favorites: Record<string, string[]>
  /** Keyed by `user:<id>` or `guest:<cartId>`. */
  carts: Record<string, CartRecord>
  coupons: CouponRecord[]
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  /** Keyed by `<userId>:<Idempotency-Key>`. */
  idempotency: Record<string, IdempotencyRecord>
  wallets: Record<string, { primary: Wallet | null; secondary: Wallet | null }>
  walletSessions: Record<string, WalletSession & { userId: string; active: boolean }>
}
