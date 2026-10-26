import { request, send } from '@/shared/api/request'
import { sessionSchema, type LoginInput, type SignupInput } from '@/shared/contracts/account'
import { cartSchema } from '@/shared/contracts/commerce'

export const authApi = {
  login: (input: LoginInput) => request('post', '/auth/login', sessionSchema, { data: input }),
  signup: (input: SignupInput) => request('post', '/auth/signup', sessionSchema, { data: input }),
  session: (signal?: AbortSignal) => request('get', '/auth/session', sessionSchema, { signal }),
  logout: () => send('post', '/auth/logout'),
  /** Moves the visitor cart (X-Cart-Id header) into the authenticated user's cart. */
  mergeCart: () => request('post', '/cart/merge', cartSchema),
}
