import { http, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import { persist } from '@/mocks/db/store'
import { apiPath, MockHttpError } from '@/mocks/lib/http'
import type { RouteKey } from '@/mocks/scenarios/definitions'
import { simulateNetwork } from '@/mocks/scenarios/state'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Resolver = HttpResponseResolver<PathParams, DefaultBodyType>

/**
 * Declares an API route: network simulation first, then the resolver. Thrown
 * MockHttpErrors become error responses and mutations are persisted afterwards.
 */
export function route(method: Method, path: string, key: RouteKey, resolver: Resolver) {
  return http[method](apiPath(path), async (info) => {
    const simulated = await simulateNetwork(key)
    if (simulated) return simulated
    try {
      return await resolver(info)
    } catch (error) {
      if (error instanceof MockHttpError) return error.response
      throw error
    } finally {
      if (method !== 'get') persist()
    }
  })
}

/** Mock control endpoints: no latency or faults, always persisted. */
export function control(method: Method, path: string, resolver: Resolver) {
  return http[method](apiPath(`/__mock${path}`), async (info) => {
    try {
      return await resolver(info)
    } catch (error) {
      if (error instanceof MockHttpError) return error.response
      throw error
    } finally {
      persist()
    }
  })
}

export function param(params: PathParams, name: string): string {
  const value = params[name]
  return Array.isArray(value) ? (value[0] ?? '') : String(value ?? '')
}
