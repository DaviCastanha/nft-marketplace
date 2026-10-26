import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { announce } from '@/shared/a11y/announcer'
import { queryKeys } from '@/shared/api/query-keys'
import { request, send } from '@/shared/api/request'
import { favoritesResponseSchema, type FavoritesResponse } from '@/shared/contracts/commerce'
import type { NftSummary } from '@/shared/contracts/nft'
import { useCurrentUser } from '@/shared/session/session-store'

export const favoriteQueries = {
  list: (userId: string) =>
    queryOptions({
      queryKey: queryKeys.user.favorites(userId),
      queryFn: ({ signal }) => request('get', '/favorites', favoritesResponseSchema, { signal }),
    }),
}

export function useFavoriteIds(): Set<string> {
  const user = useCurrentUser()
  const query = useQuery({
    ...favoriteQueries.list(user?.id ?? ''),
    enabled: Boolean(user),
    select: (data) => new Set(data.items.map((item) => item.id)),
  })
  return query.data ?? EMPTY
}
const EMPTY = new Set<string>()

/**
 * Optimistic favorite toggle: the list is updated before the API answers and
 * restored from the snapshot if the mutation fails.
 */
export function useToggleFavorite() {
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })

  const mutation = useMutation({
    mutationKey: ['favorites', 'toggle'],
    mutationFn: ({ nft, favorite }: { nft: NftSummary; favorite: boolean }) =>
      send(favorite ? 'put' : 'delete', `/favorites/${encodeURIComponent(nft.id)}`),
    onMutate: async ({ nft, favorite }) => {
      const key = queryKeys.user.favorites(user!.id)
      await queryClient.cancelQueries({ queryKey: key })
      const snapshot = queryClient.getQueryData<FavoritesResponse>(key)
      queryClient.setQueryData<FavoritesResponse>(key, (current) => {
        const items = (current?.items ?? []).filter((item) => item.id !== nft.id)
        return { items: favorite ? [nft, ...items] : items }
      })
      announce(favorite ? `${nft.name} adicionado aos favoritos.` : `${nft.name} removido dos favoritos.`)
      return { snapshot, key }
    },
    onError: (_error, { nft, favorite }, context) => {
      if (context) queryClient.setQueryData(context.key, context.snapshot)
      const message = `Não foi possível ${favorite ? 'favoritar' : 'remover dos favoritos'} ${nft.name}. O estado anterior foi restaurado.`
      toast.error(message)
      announce(message)
    },
    onSettled: (_data, _error, _vars, context) => {
      if (context) void queryClient.invalidateQueries({ queryKey: context.key })
    },
  })

  return (nft: NftSummary, favorite: boolean) => {
    if (!user) {
      toast.info('Entre na sua conta para salvar favoritos.')
      void navigate({ to: '/login', search: { redirect: href } })
      return
    }
    mutation.mutate({ nft, favorite })
  }
}
