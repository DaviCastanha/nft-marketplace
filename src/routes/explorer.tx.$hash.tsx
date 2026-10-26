import { Link, createFileRoute } from '@tanstack/react-router'

/** Simulated block explorer: transaction references in this demo are not on a real chain. */
export const Route = createFileRoute('/explorer/tx/$hash')({
  head: () => ({ meta: [{ title: 'Explorador simulado — Kurio' }] }),
  component: ExplorerPage,
})

function ExplorerPage() {
  const { hash } = Route.useParams()
  return (
    <section aria-labelledby="explorer-title" className="page-container flex flex-col gap-6 py-16">
      <p className="w-fit rounded-sm border border-primary px-2 py-1 text-xs font-bold text-text-accent">EXPLORADOR SIMULADO</p>
      <h1 id="explorer-title" className="text-2xl font-bold">
        Detalhes da transação
      </h1>
      <dl className="grid gap-3 bg-card p-6 text-sm sm:grid-cols-[180px_1fr]">
        <dt className="text-text-tertiary">Hash da transação</dt>
        <dd className="font-mono break-all">{hash}</dd>
        <dt className="text-text-tertiary">Status</dt>
        <dd className="text-success">Sucesso (simulado)</dd>
      </dl>
      <p className="max-w-2xl text-text-secondary">
        Esta demonstração não envia transações para uma blockchain real. O identificador acima foi gerado pela simulação da API e não pode ser consultado em
        exploradores públicos.
      </p>
      <Link to="/" className="text-text-accent underline underline-offset-4">
        Voltar ao início
      </Link>
    </section>
  )
}
