import { accountHandlers } from '@/mocks/handlers/account'
import { authHandlers } from '@/mocks/handlers/auth'
import { cartHandlers } from '@/mocks/handlers/cart'
import { checkoutHandlers } from '@/mocks/handlers/checkout'
import { controlHandlers } from '@/mocks/handlers/control'
import { favoriteHandlers } from '@/mocks/handlers/favorites'
import { nftHandlers } from '@/mocks/handlers/nfts'
import { realtimeHandler } from '@/mocks/realtime/server'

export const handlers = [
  ...controlHandlers,
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...accountHandlers,
  realtimeHandler,
]
