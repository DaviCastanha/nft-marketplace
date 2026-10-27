/** Route identifiers used by the network middleware to target latency and faults. */
export type RouteKey =
  | 'auth.signup'
  | 'auth.login'
  | 'auth.session'
  | 'auth.logout'
  | 'nfts.list'
  | 'nfts.featured'
  | 'nfts.detail'
  | 'nfts.related'
  | 'favorites.list'
  | 'favorites.add'
  | 'favorites.remove'
  | 'cart.get'
  | 'cart.mutate'
  | 'cart.coupon'
  | 'cart.merge'
  | 'quote.create'
  | 'orders.create'
  | 'orders.get'
  | 'profile.get'
  | 'profile.update'
  | 'profile.avatar'
  | 'profile.password'
  | 'wallets.get'
  | 'wallets.update'
  | 'wallets.session'

export type Fault = 'network-error' | 'timeout' | 500 | 503

/** Decides the fault for the n-th request (0-based) to a route; null lets it through. */
export type FaultRule = (sequence: number) => Fault | null

export type LatencyRule = (route: RouteKey, sequence: number, random: () => number) => number

export interface Scenario {
  id: string
  label: string
  description: string
  latency: LatencyRule
  faults?: Partial<Record<RouteKey, FaultRule>>
  /** Every API call fails at the connection level. */
  offline?: boolean
  /** The catalog has no NFTs. */
  catalogEmpty?: boolean
  sessionTtlMs?: number
  /** What happens to orders after creation; "hold" waits for /__mock/orders/:id/resolve. */
  orderOutcome?: 'confirmed' | 'rejected' | 'hold'
  /** The first order creation commits but never answers, forcing a client timeout. */
  orderTimeoutOnce?: boolean
  /** A change applied to the first cart line shortly after a checkout quote is created. */
  onCheckoutQuote?: 'price-change' | 'sold-out'
  /** Wallet connection prompts are rejected by the "user". */
  walletRejects?: boolean
}

const fixed =
  (ms: number): LatencyRule =>
  () =>
    ms

const DEFAULT_LATENCY_MS = 120
const failFirst =
  (count: number, fault: Fault): FaultRule =>
  (sequence) =>
    sequence < count ? fault : null
const always =
  (fault: Fault): FaultRule =>
  () =>
    fault

// Query retries (2) + the initial attempt = 3 failures before the UI shows the error.
const UNTIL_MANUAL_RETRY = 3

export const SCENARIOS = [
  {
    id: 'default',
    label: 'Padrão',
    description: 'Respostas rápidas e determinísticas, sem falhas.',
    latency: fixed(DEFAULT_LATENCY_MS),
  },
  {
    id: 'empty',
    label: 'Catálogo vazio',
    description: 'A busca de NFTs não retorna resultados.',
    latency: fixed(DEFAULT_LATENCY_MS),
    catalogEmpty: true,
  },
  {
    id: 'slow',
    label: 'Rede lenta',
    description: 'Todas as respostas levam 2,5 s (skeletons visíveis).',
    latency: fixed(2_500),
  },
  {
    id: 'variable-latency',
    label: 'Latência variável',
    description: 'Latência entre 200 ms e 1,6 s, sorteada com semente fixa.',
    latency: (_route, _seq, random) => 200 + Math.round(random() * 1_400),
  },
  {
    id: 'out-of-order',
    label: 'Respostas fora de ordem',
    description: 'Cada nova busca do catálogo responde mais rápido que a anterior.',
    latency: (route, sequence) =>
      route === 'nfts.list' ? Math.max(100, 1_800 - sequence * 600) : DEFAULT_LATENCY_MS,
  },
  {
    id: 'flaky',
    label: 'Falha transitória',
    description: 'Catálogo e detalhe falham (503) até uma nova tentativa manual.',
    latency: fixed(DEFAULT_LATENCY_MS),
    faults: { 'nfts.list': failFirst(UNTIL_MANUAL_RETRY, 503), 'nfts.detail': failFirst(UNTIL_MANUAL_RETRY, 503) },
  },
  {
    id: 'timeout',
    label: 'Timeout de requisição',
    description: 'A primeira busca do catálogo e do detalhe não responde (timeout de 10 s no cliente); a nova tentativa automática recupera.',
    latency: fixed(DEFAULT_LATENCY_MS),
    faults: { 'nfts.list': failFirst(1, 'timeout'), 'nfts.detail': failFirst(1, 'timeout') },
  },
  {
    id: 'server-error',
    label: 'Erro do servidor',
    description: 'Catálogo e detalhe sempre respondem 500.',
    latency: fixed(DEFAULT_LATENCY_MS),
    faults: { 'nfts.list': always(500), 'nfts.detail': always(500), 'nfts.featured': always(500) },
  },
  {
    id: 'offline',
    label: 'Sem conexão',
    description: 'Todas as chamadas à API falham na conexão.',
    latency: fixed(0),
    offline: true,
  },
  {
    id: 'session-expired',
    label: 'Sessão curta',
    description: 'Sessões expiram 30 s após o login.',
    latency: fixed(DEFAULT_LATENCY_MS),
    sessionTtlMs: 30_000,
  },
  {
    id: 'favorites-fail',
    label: 'Falha ao favoritar',
    description: 'Incluir ou remover favoritos responde 500 (rollback otimista).',
    latency: fixed(DEFAULT_LATENCY_MS),
    faults: { 'favorites.add': always(500), 'favorites.remove': always(500) },
  },
  {
    id: 'price-change-on-checkout',
    label: 'Preço muda no checkout',
    description: 'O preço do primeiro item sobe logo após a cotação do checkout.',
    latency: fixed(DEFAULT_LATENCY_MS),
    onCheckoutQuote: 'price-change',
  },
  {
    id: 'sold-out-on-checkout',
    label: 'Edição esgota no checkout',
    description: 'A edição do primeiro item esgota logo após a cotação do checkout.',
    latency: fixed(DEFAULT_LATENCY_MS),
    onCheckoutQuote: 'sold-out',
  },
  {
    id: 'order-timeout',
    label: 'Timeout no pedido',
    description: 'O primeiro envio do pedido é criado mas não responde; o reenvio recupera o mesmo pedido.',
    latency: fixed(DEFAULT_LATENCY_MS),
    orderTimeoutOnce: true,
  },
  {
    id: 'payment-rejected',
    label: 'Pagamento recusado',
    description: 'Pedidos criados terminam recusados.',
    latency: fixed(DEFAULT_LATENCY_MS),
    orderOutcome: 'rejected',
  },
  {
    id: 'order-pending',
    label: 'Pedido pendente',
    description: 'Pedidos ficam pendentes até serem resolvidos pelo painel ou pelos testes.',
    latency: fixed(DEFAULT_LATENCY_MS),
    orderOutcome: 'hold',
  },
  {
    id: 'wallet-rejected',
    label: 'Carteira recusa',
    description: 'A conexão com a carteira é recusada.',
    latency: fixed(DEFAULT_LATENCY_MS),
    walletRejects: true,
  },
] as const satisfies readonly Scenario[]

export type ScenarioId = (typeof SCENARIOS)[number]['id']
export const DEFAULT_SCENARIO: ScenarioId = 'default'

export function findScenario(id: string | null | undefined): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
