import { QueryClient } from '@tanstack/react-query'
import { isRetryableError, type ApiError } from '@/shared/api/errors'

declare module '@tanstack/react-query' {
  interface Register {
    // Every request goes through the Axios client, which normalizes failures into ApiError.
    defaultError: ApiError
  }
}

const MAX_QUERY_RETRIES = 2

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Only transient failures (network, timeout, 5xx) are worth retrying.
        retry: (failureCount, error) => failureCount < MAX_QUERY_RETRIES && isRetryableError(error),
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
      },
      mutations: {
        retry: false,
      },
    },
  })
}
