import { local } from '@/shared/lib/storage'

const CART_ID_KEY = 'kurio:cart-id'

/** Identifies the visitor cart on the API (X-Cart-Id). Created lazily and kept across refreshes. */
export function getCartId(): string {
  const existing = local.read<string>(CART_ID_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  local.write(CART_ID_KEY, id)
  return id
}

/** A new visitor identity after logout, so the next visitor never sees the previous cart. */
export function rotateCartId() {
  local.write(CART_ID_KEY, crypto.randomUUID())
}
