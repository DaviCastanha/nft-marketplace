import axios from 'axios'
import { toApiError } from '@/shared/api/errors'
import { getCartId } from '@/shared/lib/cart-id'
import { sessionStore } from '@/shared/session/session-store'

export const REQUEST_TIMEOUT_MS = 10_000

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
  // Arrays as repeated keys (category=a&category=b), matching the URL search params.
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config) => {
  const token = sessionStore.token()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Cart-Id', getCartId())
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    // A rejected token ends the session globally; listeners clear private caches and redirect.
    if (apiError.status === 401 && (apiError.code === 'SESSION_EXPIRED' || apiError.code === 'UNAUTHORIZED') && sessionStore.token()) {
      sessionStore.end('expired')
    }
    return Promise.reject(apiError)
  },
)
