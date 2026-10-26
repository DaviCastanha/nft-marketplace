import { createFileRoute } from '@tanstack/react-router'
import { catalogQueries } from '@/features/catalog/api'
import { NftDetailPage } from '@/features/nft/nft-detail-page'

export const Route = createFileRoute('/nfts/$nftId')({
  // Direct access works: the loader starts the request and the page renders a skeleton meanwhile.
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(catalogQueries.detail(params.nftId))
    void context.queryClient.prefetchQuery(catalogQueries.related(params.nftId))
  },
  head: () => ({ meta: [{ title: 'Detalhes do NFT — Kurio' }] }),
  component: NftDetailPage,
})
