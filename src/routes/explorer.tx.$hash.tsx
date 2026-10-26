import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/explorer/tx/$hash')({
  component: () => <section className="page-container py-16">Em construção</section>,
})
