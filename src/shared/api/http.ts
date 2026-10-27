import axios, { type InternalAxiosRequestConfig } from 'axios'
import { ApiError, toApiError } from '@/shared/api/errors'
import { getCartId } from '@/shared/lib/cart-id'
import { sessionStore } from '@/shared/session/session-store'

export const REQUEST_TIMEOUT_MS = 10_000

type TimedConfig = InternalAxiosRequestConfig & { timeoutTimer?: ReturnType<typeof setTimeout>; timedOut?: boolean }

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
  // Arrays as repeated keys (category=a&category=b), matching what the mock API parses.
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config: TimedConfig) => {
  const token = sessionStore.token()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Cart-Id', getCartId())

  // Timeout through a JS timer + AbortController instead of the XHR's native timeout:
  // same behavior, but driven by the page clock, so time-sensitive flows are testable.
  const controller = new AbortController()
  config.timeoutTimer = setTimeout(() => {
    config.timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  config.signal = config.signal ? AbortSignal.any([config.signal as AbortSignal, controller.signal]) : controller.signal
  return config
})

http.interceptors.response.use(
  (response) => {
    clearTimeout((response.config as TimedConfig).timeoutTimer)
    return response
  },
  (error: unknown) => {
    const config = axios.isAxiosError(error) ? (error.config as TimedConfig | undefined) : undefined
    clearTimeout(config?.timeoutTimer)
    const apiError = config?.timedOut
      ? new ApiError({ code: 'TIMEOUT', message: 'A requisição demorou demais para responder.' }, null)
      : toApiError(error)
    // A rejected token ends the session globally; listeners clear private caches and redirect.
    if (apiError.status === 401 && (apiError.code === 'SESSION_EXPIRED' || apiError.code === 'UNAUTHORIZED') && sessionStore.token()) {
      sessionStore.end('expired')
    }
    return Promise.reject(apiError)
  },
)
