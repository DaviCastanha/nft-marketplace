import { queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import { request, send } from '@/shared/api/request'
import {
  userSchema,
  walletSessionSchema,
  walletsResponseSchema,
  type AvatarInput,
  type PasswordChangeInput,
  type ProfileInput,
  type WalletInput,
  type WalletSessionInput,
  type WalletSlot,
} from '@/shared/contracts/account'

export const accountApi = {
  profile: (signal?: AbortSignal) => request('get', '/profile', userSchema, { signal }),
  updateProfile: (input: ProfileInput) => request('put', '/profile', userSchema, { data: input }),
  uploadAvatar: (input: AvatarInput) => request('post', '/profile/avatar', userSchema, { data: input }),
  removeAvatar: () => request('delete', '/profile/avatar', userSchema),
  changePassword: (input: PasswordChangeInput) => send('post', '/profile/password', { data: input }),
  wallets: (signal?: AbortSignal) => request('get', '/wallets', walletsResponseSchema, { signal }),
  saveWallet: (slot: WalletSlot, input: WalletInput) => request('put', `/wallets/${slot}`, walletsResponseSchema, { data: input }),
  connectWallet: (input: WalletSessionInput) => request('post', '/wallet-sessions', walletSessionSchema, { data: input }),
  disconnectWallet: (sessionId: string) => send('delete', `/wallet-sessions/${sessionId}`),
}

export const accountQueries = {
  profile: (userId: string) =>
    queryOptions({ queryKey: queryKeys.user.profile(userId), queryFn: ({ signal }) => accountApi.profile(signal) }),
  wallets: (userId: string) =>
    queryOptions({ queryKey: queryKeys.user.wallets(userId), queryFn: ({ signal }) => accountApi.wallets(signal) }),
}
