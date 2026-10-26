import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { WalletsPage } from '@/features/account/wallets-page'

const searchSchema = z.object({
  redirect: z
    .string()
    .refine((value) => value.startsWith('/') && !value.startsWith('//'))
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_auth/account/wallets')({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: 'Carteiras — Kurio' }] }),
  component: WalletsPage,
})
