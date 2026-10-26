import type { Buyer } from '@/shared/contracts/commerce'
import type { Network } from '@/shared/contracts/common'
import { local, session } from '@/shared/lib/storage'

/** Checkout draft: survives refresh and session expiry (re-login returns to /checkout). */
export interface CheckoutDraft {
  buyer: Partial<Buyer>
  walletId: string | null
  network: Network | null
}

const draftKey = (userId: string) => `kurio:checkout-draft:${userId}`
const attemptKey = (userId: string) => `kurio:checkout-attempt:${userId}`
const pendingKey = (userId: string) => `kurio:pending-order:${userId}`

export const checkoutDraft = {
  read: (userId: string) => session.read<CheckoutDraft>(draftKey(userId)),
  write: (userId: string, draft: CheckoutDraft) => session.write(draftKey(userId), draft),
  clear: (userId: string) => session.remove(draftKey(userId)),
}

/**
 * Idempotency key for one purchase attempt. The same payload reuses the same key
 * (retries after a timeout recover the same order); a different payload gets a new one.
 */
export function idempotencyKeyFor(userId: string, payload: unknown): string {
  const fingerprint = JSON.stringify(payload)
  const saved = session.read<{ key: string; fingerprint: string }>(attemptKey(userId))
  if (saved?.fingerprint === fingerprint) return saved.key
  const key = crypto.randomUUID()
  session.write(attemptKey(userId), { key, fingerprint })
  return key
}

export function clearAttempt(userId: string) {
  session.remove(attemptKey(userId))
}

/** The last order awaiting settlement, so the user can resume it instead of buying again. */
export const pendingOrder = {
  read: (userId: string) => local.read<string>(pendingKey(userId)),
  write: (userId: string, orderId: string) => local.write(pendingKey(userId), orderId),
  clear: (userId: string) => local.remove(pendingKey(userId)),
}
