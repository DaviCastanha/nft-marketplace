import { useEffect, useId, useState } from 'react'

interface ScenarioInfo {
  id: string
  label: string
  description: string
}

async function control(method: string, path: string, body?: unknown) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/__mock${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return response.status === 204 ? null : response.json()
}

/**
 * Demo/dev control panel for the mock layer. It lives outside the app tree and only
 * talks to the mock control endpoints over HTTP, so app code never knows about mocks.
 * Data changes made here travel to the UI through REST and Socket.IO, like real ones.
 */
export function ScenarioPanel() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<{ scenario: string; scenarios: ScenarioInfo[] } | null>(null)
  const [status, setStatus] = useState('')
  const titleId = useId()

  useEffect(() => {
    if (open && !state) void control('GET', '/state').then(setState)
  }, [open, state])

  const run = async (label: string, action: () => Promise<unknown>, reload = false) => {
    setStatus(`${label}…`)
    await action()
    setStatus(`${label}: feito.`)
    if (reload) window.location.reload()
  }

  return (
    <div className="fixed bottom-28 left-3 z-[60] font-sans text-sm lg:bottom-4">
      {open && (
        <section
          role="dialog"
          aria-labelledby={titleId}
          className="mb-2 flex max-h-[70dvh] w-[300px] flex-col gap-3 overflow-y-auto rounded-md border border-border-soft bg-surface-raised p-4 shadow-raised"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <h2 id={titleId} className="font-bold">
            Simulação (MSW)
          </h2>
          <label className="flex flex-col gap-1">
            <span>Cenário ativo</span>
            <select
              className="rounded-sm border border-border bg-ink px-2 py-1.5"
              value={state?.scenario ?? ''}
              onChange={(e) => void run('Trocando cenário', () => control('PUT', '/scenario', { id: e.target.value }), true)}
            >
              {state?.scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
          </label>
          {state && <p className="text-xs text-text-secondary">{state.scenarios.find((s) => s.id === state.scenario)?.description}</p>}
          <div className="flex flex-col gap-2">
            <button type="button" className="rounded-sm border border-border px-2 py-1.5 text-left hover:border-primary" onClick={() => void run('Restaurando dados', () => control('POST', '/reset', {}), true)}>
              Restaurar dados iniciais
            </button>
            <button
              type="button"
              className="rounded-sm border border-border px-2 py-1.5 text-left hover:border-primary"
              onClick={() => void run('Alterando preço do Emerald Ape #042', () => control('POST', '/nfts/emerald-ape-042', { editionId: '1-50', price: (1 + Math.round(Math.random() * 200) / 100).toFixed(2) }))}
            >
              Mudar preço do Emerald Ape #042
            </button>
            <button
              type="button"
              className="rounded-sm border border-border px-2 py-1.5 text-left hover:border-primary"
              onClick={() => void run('Esgotando edição 1/50 do Emerald Ape #042', () => control('POST', '/nfts/emerald-ape-042', { editionId: '1-50', available: 0 }))}
            >
              Esgotar edição 1/50 do Emerald Ape #042
            </button>
            <button
              type="button"
              className="rounded-sm border border-border px-2 py-1.5 text-left hover:border-primary"
              onClick={() => void run('Confirmando pedidos pendentes', () => control('POST', '/orders/resolve-pending', { status: 'confirmed' }))}
            >
              Confirmar pedidos pendentes
            </button>
            <button
              type="button"
              className="rounded-sm border border-border px-2 py-1.5 text-left hover:border-primary"
              onClick={() => void run('Recusando pedidos pendentes', () => control('POST', '/orders/resolve-pending', { status: 'rejected' }))}
            >
              Recusar pedidos pendentes
            </button>
            <button type="button" className="rounded-sm border border-border px-2 py-1.5 text-left hover:border-primary" onClick={() => void run('Expirando sessões', () => control('POST', '/sessions/expire'))}>
              Expirar sessão
            </button>
            <button type="button" className="rounded-sm border border-border px-2 py-1.5 text-left hover:border-primary" onClick={() => void run('Derrubando conexão em tempo real', () => control('POST', '/socket/disconnect'))}>
              Derrubar conexão Socket.IO
            </button>
          </div>
          <p role="status" className="min-h-5 text-xs text-text-accent">
            {status}
          </p>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-full border border-primary bg-ink px-3 py-1.5 text-xs font-bold text-text-accent shadow-raised"
      >
        {open ? 'Fechar simulação' : 'Simulação'}
      </button>
    </div>
  )
}

