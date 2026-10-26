import { createFileRoute } from '@tanstack/react-router'
import { authSearchSchema } from '@/features/auth/search'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  component: () => <section className="page-container py-16">Em construção</section>,
})
