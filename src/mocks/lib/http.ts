import { HttpResponse } from 'msw'
import type { z } from 'zod'
import type { ApiErrorBody, ApiErrorCode } from '@/shared/api/errors'

export const apiPath = (path: string) => `${import.meta.env.VITE_API_URL}${path}`

/** Thrown from resolvers and turned into the response by the route wrapper. */
export class MockHttpError extends Error {
  readonly response: Response
  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.response = HttpResponse.json(body, { status })
  }
}

export function fail(status: number, code: ApiErrorCode, message: string, extra: Omit<ApiErrorBody, 'code' | 'message'> = {}): never {
  throw new MockHttpError(status, { code, message, ...extra })
}

/** Parses a JSON body with the shared contract; schema issues become a 422 with field messages. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const raw: unknown = await request.json().catch(() => undefined)
  const result = schema.safeParse(raw)
  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_'
      fields[key] ??= issue.message
    }
    fail(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', { fields })
  }
  return result.data
}

export const noContent = () => new HttpResponse(null, { status: 204 })
