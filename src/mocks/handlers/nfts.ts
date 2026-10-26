import Big from 'big.js'
import { HttpResponse } from 'msw'
import { CATEGORIES, NETWORKS } from '@/shared/contracts/common'
import {
  CATALOG_PAGE_SIZE,
  catalogDefaults,
  catalogSearchSchema,
  type CatalogSearch,
  type FeaturedResponse,
  type NftListResponse,
} from '@/shared/contracts/nft'
import { findNft, toDetail, toSummary } from '@/mocks/domain/catalog'
import { SEED_NOW } from '@/mocks/db/seed'
import { db } from '@/mocks/db/store'
import type { NftRecord } from '@/mocks/db/types'
import { param, route } from '@/mocks/lib/route'
import { currentScenario } from '@/mocks/scenarios/state'

const NEW_RELEASE_WINDOW_MS = 14 * 24 * 3_600_000
const TRENDING_MIN_POPULARITY = 60
const RELATED_LIMIT = 10

function parseSearch(url: URL): CatalogSearch {
  const { searchParams } = url
  return catalogSearchSchema.parse({
    q: searchParams.get('q') ?? undefined,
    category: searchParams.getAll('category'),
    network: searchParams.getAll('network'),
    minPrice: searchParams.get('minPrice') ?? undefined,
    maxPrice: searchParams.get('maxPrice') ?? undefined,
    tab: searchParams.get('tab') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    page: searchParams.get('page') ?? undefined,
  })
}

function catalog(): NftRecord[] {
  return currentScenario().catalogEmpty ? [] : db().nfts
}

const matchesText = (nft: NftRecord, q: string | undefined) => {
  if (!q) return true
  const needle = q.toLowerCase()
  return [nft.name, nft.collection, nft.creator, nft.tokenId].some((field) => field.toLowerCase().includes(needle))
}

const matchesTab = (nft: NftRecord, tab: CatalogSearch['tab']) => {
  if (tab === 'new') return Date.parse(nft.listedAt) >= SEED_NOW - NEW_RELEASE_WINDOW_MS
  if (tab === 'trending') return nft.popularity >= TRENDING_MIN_POPULARITY
  return true
}

const SORTERS: Record<NonNullable<CatalogSearch['sort']>, (a: NftRecord, b: NftRecord) => number> = {
  recent: (a, b) => b.listedAt.localeCompare(a.listedAt) || a.id.localeCompare(b.id),
  'price-asc': (a, b) => Big(a.price).cmp(b.price) || a.id.localeCompare(b.id),
  'price-desc': (a, b) => Big(b.price).cmp(a.price) || a.id.localeCompare(b.id),
  popular: (a, b) => b.popularity - a.popularity || a.id.localeCompare(b.id),
}

export const nftHandlers = [
  route('get', '/nfts', 'nfts.list', ({ request }) => {
    const search = parseSearch(new URL(request.url))
    const { tab = catalogDefaults.tab, sort = catalogDefaults.sort, page = catalogDefaults.page } = search
    const all = catalog()

    // Facet counts reflect text and tab, not the facet selections themselves.
    const scoped = all.filter((nft) => matchesText(nft, search.q) && matchesTab(nft, tab))
    const filtered = scoped
      .filter((nft) => !search.category?.length || search.category.includes(nft.category))
      .filter((nft) => !search.network?.length || search.network.includes(nft.network))
      .filter((nft) => search.minPrice === undefined || Big(nft.price).gte(search.minPrice))
      .filter((nft) => search.maxPrice === undefined || Big(nft.price).lte(search.maxPrice))
      .sort(SORTERS[sort])

    const total = filtered.length
    const totalPages = Math.ceil(total / CATALOG_PAGE_SIZE)
    const start = (page - 1) * CATALOG_PAGE_SIZE
    const prices = all.map((nft) => Big(nft.price))

    const body: NftListResponse = {
      items: filtered.slice(start, start + CATALOG_PAGE_SIZE).map(toSummary),
      page,
      pageSize: CATALOG_PAGE_SIZE,
      total,
      totalPages,
      facets: {
        categories: CATEGORIES.map((id) => ({ id, count: scoped.filter((n) => n.category === id).length })),
        networks: NETWORKS.map((id) => ({ id, count: scoped.filter((n) => n.network === id).length })),
        priceRange: {
          min: prices.length ? prices.reduce((a, b) => (a.lt(b) ? a : b)).toString() : '0',
          max: prices.length ? prices.reduce((a, b) => (a.gt(b) ? a : b)).toString() : '0',
        },
      },
    }
    return HttpResponse.json(body)
  }),

  route('get', '/nfts/featured', 'nfts.featured', () => {
    const all = db().nfts
    const hero = [...all].sort(SORTERS.popular).slice(0, 3).map(toSummary)
    const spotlight = all.find((nft) => nft.id === 'sage-nomad-009') ?? all[0]!
    const body: FeaturedResponse = { hero, spotlight: toSummary(spotlight) }
    return HttpResponse.json(body)
  }),

  route('get', '/nfts/:id', 'nfts.detail', ({ params }) => HttpResponse.json(toDetail(findNft(param(params, 'id'))))),

  route('get', '/nfts/:id/related', 'nfts.related', ({ params }) => {
    const nft = findNft(param(params, 'id'))
    const sameCollection = db().nfts.filter((n) => n.id !== nft.id && n.collection === nft.collection)
    const others = db().nfts.filter((n) => n.id !== nft.id && n.collection !== nft.collection)
    return HttpResponse.json({ items: [...sameCollection, ...others].slice(0, RELATED_LIMIT).map(toSummary) })
  }),
]
