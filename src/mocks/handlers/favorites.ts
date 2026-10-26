import { HttpResponse } from 'msw'
import type { FavoritesResponse } from '@/shared/contracts/commerce'
import { requireUser } from '@/mocks/domain/auth'
import { findNft, toSummary } from '@/mocks/domain/catalog'
import { db } from '@/mocks/db/store'
import { noContent } from '@/mocks/lib/http'
import { param, route } from '@/mocks/lib/route'

export const favoriteHandlers = [
  route('get', '/favorites', 'favorites.list', ({ request }) => {
    const user = requireUser(request)
    const ids = db().favorites[user.id] ?? []
    const items = ids.flatMap((id) => {
      const nft = db().nfts.find((n) => n.id === id)
      return nft ? [toSummary(nft)] : []
    })
    return HttpResponse.json<FavoritesResponse>({ items })
  }),

  // PUT/DELETE are idempotent, so a retried request never toggles the state twice.
  route('put', '/favorites/:nftId', 'favorites.add', ({ request, params }) => {
    const user = requireUser(request)
    const nft = findNft(param(params, 'nftId'))
    const list = (db().favorites[user.id] ??= [])
    if (!list.includes(nft.id)) list.unshift(nft.id)
    return noContent()
  }),

  route('delete', '/favorites/:nftId', 'favorites.remove', ({ request, params }) => {
    const user = requireUser(request)
    const nftId = param(params, 'nftId')
    db().favorites[user.id] = (db().favorites[user.id] ?? []).filter((id) => id !== nftId)
    return noContent()
  }),
]
