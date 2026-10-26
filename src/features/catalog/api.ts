import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import { request } from '@/shared/api/request'
import {
  featuredResponseSchema,
  nftDetailSchema,
  nftListResponseSchema,
  relatedResponseSchema,
  type CatalogSearch,
} from '@/shared/contracts/nft'

export const catalogQueries = {
  // The query signal cancels superseded requests, and keying by the full search
  // object means a late response can only ever land in its own cache entry.
  list: (search: CatalogSearch) =>
    queryOptions({
      queryKey: queryKeys.catalog.list(search),
      queryFn: ({ signal }) => request('get', '/nfts', nftListResponseSchema, { params: search, signal }),
      placeholderData: keepPreviousData,
    }),
  featured: () =>
    queryOptions({
      queryKey: queryKeys.catalog.featured(),
      queryFn: ({ signal }) => request('get', '/nfts/featured', featuredResponseSchema, { signal }),
      staleTime: 5 * 60_000,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.catalog.detail(id),
      queryFn: ({ signal }) => request('get', `/nfts/${encodeURIComponent(id)}`, nftDetailSchema, { signal }),
    }),
  related: (id: string) =>
    queryOptions({
      queryKey: queryKeys.catalog.related(id),
      queryFn: ({ signal }) => request('get', `/nfts/${encodeURIComponent(id)}/related`, relatedResponseSchema, { signal }),
      staleTime: 5 * 60_000,
    }),
}
