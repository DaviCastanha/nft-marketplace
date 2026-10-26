import { isAxiosError } from 'axios'

/** Error codes shared by the REST contracts and the mock layer. */
export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'EDITION_UNAVAILABLE'
  | 'QUANTITY_LIMIT'
  | 'WALLET_DISCONNECTED'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'OUT_OF_STOCK'
  | 'QUOTE_STALE'
  | 'IDEMPOTENCY_CONFLICT'
  | 'PAYMENT_REJECTED'
  | 'WALLET_REJECTED'
  | 'UNKNOWN'

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  /** Field-level messages for 422 responses, keyed by form field name. */
  fields?: Record<string, string>
  details?: unknown
}

/** Normalized error thrown by the HTTP client for every failed request. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  readonly fields: Record<string, string>
  readonly details: unknown

  constructor(body: ApiErrorBody, status: number | null) {
    super(body.message)
    this.name = 'ApiError'
    this.code = body.code
    this.status = status
    this.fields = body.fields ?? {}
    this.details = body.details
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ code: 'TIMEOUT', message: 'A requisição demorou demais para responder.' }, null)
    }
    if (!error.response) {
      return new ApiError({ code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor.' }, null)
    }
    const { status, data } = error.response
    if (isApiErrorBody(data)) return new ApiError(data, status)
    return new ApiError(
      { code: status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN', message: 'Algo deu errado. Tente novamente.' },
      status,
    )
  }
  return new ApiError({ code: 'UNKNOWN', message: 'Algo deu errado. Tente novamente.' }, null)
}

export function isRetryableError(error: unknown) {
  const apiError = toApiError(error)
  return (
    apiError.code === 'NETWORK_ERROR' ||
    apiError.code === 'TIMEOUT' ||
    (apiError.status !== null && apiError.status >= 500)
  )
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  return typeof data === 'object' && data !== null && 'code' in data && 'message' in data
}
