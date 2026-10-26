import { z } from 'zod'

/** Only same-origin paths are accepted as redirect targets (prevents open redirects). */
const redirectSchema = z
  .string()
  .refine((value) => value.startsWith('/') && !value.startsWith('//'), 'Destino inválido')
  .optional()
  .catch(undefined)

export const authSearchSchema = z.object({
  redirect: redirectSchema,
  reason: z.enum(['expired']).optional().catch(undefined),
})
export type AuthSearch = z.infer<typeof authSearchSchema>
