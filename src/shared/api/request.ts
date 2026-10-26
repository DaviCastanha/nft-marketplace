import type { AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { ApiError } from '@/shared/api/errors'
import { http } from '@/shared/api/http'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

/**
 * Performs a request through the shared Axios client and validates the payload
 * with the contract schema, so the cache and the UI only ever see typed data.
 */
export async function request<T extends z.ZodType>(
  method: Method,
  url: string,
  schema: T,
  config: AxiosRequestConfig = {},
): Promise<z.infer<T>> {
  const response = await http.request({ method, url, ...config })
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    if (import.meta.env.DEV) console.error(`Contract mismatch on ${method.toUpperCase()} ${url}`, parsed.error.issues)
    throw new ApiError({ code: 'UNKNOWN', message: 'Resposta inesperada do servidor.' }, response.status)
  }
  return parsed.data
}

/** For endpoints that answer 204 No Content. */
export async function send(method: Method, url: string, config: AxiosRequestConfig = {}): Promise<void> {
  await http.request({ method, url, ...config })
}
