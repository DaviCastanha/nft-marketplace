import type { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

/**
 * Plain, shareable query strings: lists become "a,b" and scalars stay as text
 * (`?category=arte-digital,musica&page=2`). Route schemas (zod) coerce the values back.
 */
function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) continue
    params.set(key, Array.isArray(value) ? value.join(',') : String(value))
  }
  const query = params.toString().replace(/%2C/g, ',')
  return query ? `?${query}` : ''
}

function parseSearch(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search))
}

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // Loaders read through the Query cache, which owns freshness.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    stringifySearch,
    parseSearch,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
