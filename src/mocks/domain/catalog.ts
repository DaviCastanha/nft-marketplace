import Big from 'big.js'
import type { NftDetail, NftSummary } from '@/shared/contracts/nft'
import { db } from '@/mocks/db/store'
import { cheapestAvailable } from '@/mocks/db/seed'
import type { NftRecord } from '@/mocks/db/types'
import { fail } from '@/mocks/lib/http'

export function toSummary(nft: NftRecord): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    collection: nft.collection,
    category: nft.category,
    network: nft.network,
    image: nft.image,
    price: nft.price,
    compareAtPrice: nft.compareAtPrice,
    badge: nft.badge,
    rating: nft.rating,
    reviewsCount: nft.reviewsCount,
    available: nft.available,
    listedAt: nft.listedAt,
    version: nft.version,
  }
}

export function toDetail({ popularity: _popularity, ...nft }: NftRecord): NftDetail {
  return nft
}

export function findNft(id: string): NftRecord {
  const nft = db().nfts.find((n) => n.id === id)
  if (!nft) fail(404, 'NOT_FOUND', 'NFT não encontrado.')
  return nft
}

export function findEdition(nft: NftRecord, editionId: string) {
  const edition = nft.editions.find((e) => e.id === editionId)
  if (!edition) fail(404, 'NOT_FOUND', 'Edição não encontrada para este NFT.')
  return edition
}

/** Recomputes card price/availability after an edition change and bumps the resource version. */
export function touchNft(nft: NftRecord) {
  nft.price = cheapestAvailable(nft.editions).price
  nft.available = nft.editions.reduce((sum, e) => sum + e.available, 0)
  nft.version += 1
}

export const compareEth = (a: string, b: string | number) => Big(a).cmp(b)
