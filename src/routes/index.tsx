import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { catalogQueries } from '@/features/catalog/api'
import { CatalogPage } from '@/features/catalog/catalog-page'
import { catalogDefaults, catalogSearchSchema } from '@/shared/contracts/nft'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  // Defaults never show up in the URL, so equal states always share one URL.
  search: { middlewares: [stripSearchParams(catalogDefaults)] },
  loaderDeps: ({ search }) => search,
  // Starts the request before render without blocking navigation (the grid shows skeletons).
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(catalogQueries.list(deps))
    void context.queryClient.prefetchQuery(catalogQueries.featured())
  },
  head: () => ({ meta: [{ title: 'Kurio — Marketplace de NFTs' }] }),
  component: CatalogPage,
})
