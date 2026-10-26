import { z } from 'zod'
import { categorySchema, imageSchema, isoDateSchema, networkSchema } from '@/shared/contracts/common'
import { ethAmountSchema } from '@/shared/lib/money'

export const editionKindSchema = z.enum(['unique', 'limited', 'open'])

export const editionSchema = z.object({
  id: z.string(),
  /** "1/1", "1/10", "1/50", "ABERTA" */
  label: z.string(),
  kind: editionKindSchema,
  /** Total supply; null for open editions. */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
  price: ethAmountSchema,
  maxPerOrder: z.number().int().positive(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** "#0042" */
  tokenId: z.string(),
  collection: z.string(),
  category: categorySchema,
  network: networkSchema,
  image: imageSchema,
  /** Price of the default (cheapest available) edition. */
  price: ethAmountSchema,
  /** Previous price shown struck through when the NFT is discounted. */
  compareAtPrice: ethAmountSchema.nullable(),
  badge: z.enum(['rare']).nullable(),
  rating: z.number().min(0).max(5),
  reviewsCount: z.number().int().min(0),
  available: z.number().int().min(0),
  listedAt: isoDateSchema,
  /** Monotonic resource version, used to order realtime updates. */
  version: z.number().int().positive(),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const reviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: isoDateSchema,
})
export type Review = z.infer<typeof reviewSchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  story: z.array(z.string()),
  creator: z.string(),
  attributes: z.array(z.string()),
  editions: z.array(editionSchema).min(1),
  gallery: z.array(imageSchema).min(1),
  royaltiesPct: z.number().min(0).max(100),
  contractAddress: z.string(),
  contractStandard: z.string(),
  networkNote: z.string(),
  reviews: z.array(reviewSchema),
})
export type NftDetail = z.infer<typeof nftDetailSchema>

// ---------------------------------------------------------------------------
// Catalog query: the same schema validates URL search params, the request sent
// by the client and the params parsed by the mock handler.

export const SORT_OPTIONS = ['recent', 'price-asc', 'price-desc', 'popular'] as const
export const sortSchema = z.enum(SORT_OPTIONS)
export type CatalogSort = z.infer<typeof sortSchema>

export const SORT_LABELS: Record<CatalogSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  popular: 'Mais populares',
}

export const CATALOG_TABS = ['all', 'new', 'trending'] as const
export const catalogTabSchema = z.enum(CATALOG_TABS)
export type CatalogTab = z.infer<typeof catalogTabSchema>

export const CATALOG_TAB_LABELS: Record<CatalogTab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const CATALOG_PAGE_SIZE = 9

/** Coerces "a,b" or ["a","b"] into a list; invalid members are dropped instead of failing the whole URL. */
const listOf = <T extends z.ZodType>(item: T) =>
  z
    .union([z.array(z.string()), z.string()])
    .transform((value) => (Array.isArray(value) ? value : value.split(',')).filter(Boolean))
    .transform((values) => values.flatMap((v) => (item.safeParse(v).success ? [v as z.infer<T>] : [])))

const priceParam = z.coerce.number().min(0).optional().catch(undefined)

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: listOf(categorySchema).optional().catch(undefined),
  network: listOf(networkSchema).optional().catch(undefined),
  minPrice: priceParam,
  maxPrice: priceParam,
  tab: catalogTabSchema.optional().catch(undefined),
  sort: sortSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const catalogDefaults = {
  tab: 'all',
  sort: 'recent',
  page: 1,
} as const satisfies Partial<CatalogSearch>

export const facetCountSchema = z.object({ id: z.string(), count: z.number().int().min(0) })

export const nftListResponseSchema = z.object({
  items: z.array(nftSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().positive(),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  facets: z.object({
    categories: z.array(facetCountSchema.extend({ id: categorySchema })),
    networks: z.array(facetCountSchema.extend({ id: networkSchema })),
    priceRange: z.object({ min: ethAmountSchema, max: ethAmountSchema }),
  }),
})
export type NftListResponse = z.infer<typeof nftListResponseSchema>

export const featuredResponseSchema = z.object({
  hero: z.array(nftSummarySchema),
  spotlight: nftSummarySchema,
})
export type FeaturedResponse = z.infer<typeof featuredResponseSchema>

export const relatedResponseSchema = z.object({ items: z.array(nftSummarySchema) })
