import { useQuery } from '@tanstack/react-query'
import { Link, getRouteApi } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { orderQueries } from '@/features/checkout/api'
import { pendingOrder } from '@/features/checkout/storage'
import { announce } from '@/shared/a11y/announcer'
import { NftImage } from '@/shared/components/nft-image'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { Order } from '@/shared/contracts/commerce'
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS } from '@/shared/contracts/common'
import { formatShortDate, shortAddress } from '@/shared/lib/format'
import { formatEth } from '@/shared/lib/money'
import { useRealtimeStatus } from '@/shared/realtime/status-store'
import { useCurrentUser } from '@/shared/session/session-store'

const route = getRouteApi('/_auth/orders/$orderId')
/** Fallback polling, only while the realtime connection is down. */
const POLL_WHILE_OFFLINE_MS = 3_000

function ThankYouMark() {
  return (
    <svg viewBox="0 0 66 82" className="h-[82px] w-[66px] text-primary" aria-hidden="true">
      <path d="M33 2 41 9H58a3 3 0 0 1 3 3v27" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M33 2 25 9H8a3 3 0 0 0-3 3v27" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M3 37v40a3 3 0 0 0 3 3h54a3 3 0 0 0 3-3V37L33 60Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M3 77 26 55M63 77 40 55" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <text x="33" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="inherit">
        THANK
      </text>
      <text x="33" y="37" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="inherit">
        YOU
      </text>
    </svg>
  )
}

/** Receipt rendered from the order snapshot: later catalog changes never alter these values. */
function Receipt({ order }: { order: Order }) {
  return (
    <article aria-labelledby="receipt-title" className="mx-auto w-full max-w-[578px] border-b-[10px] border-primary bg-card">
      <header className="relative flex flex-col items-center gap-4 px-6 pt-6 pb-5 text-center">
        <ThankYouMark />
        <h1 id="receipt-title" className="text-lg leading-6 font-bold text-text-secondary">
          Seus NFTs agora estão na sua carteira
        </h1>
        <Link to="/" aria-label="Fechar recibo e voltar ao início" className="absolute top-4 right-4 grid size-8 place-items-center rounded-sm text-primary">
          <svg viewBox="0 0 18 18" className="size-[18px]" aria-hidden="true">
            <path d="M3.5 3.5l11 11M14.5 3.5l-11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Link>
      </header>

      <dl className="grid grid-cols-2 border-y border-primary px-6 py-4 text-[15px] leading-5 sm:grid-cols-4 sm:divide-x sm:divide-primary">
        <div className="flex flex-col pr-3">
          <dt className="font-bold text-text-secondary">ID da transação</dt>
          <dd className="font-mono" title={order.transactionHash ?? ''}>
            {order.transactionHash ? shortAddress(order.transactionHash).toUpperCase().replace('0X', '0x') : '—'}
          </dd>
        </div>
        <div className="flex flex-col sm:px-3">
          <dt className="text-text-secondary">Data</dt>
          <dd>{formatShortDate(order.updatedAt)}</dd>
        </div>
        <div className="flex flex-col pt-3 sm:px-3 sm:pt-0">
          <dt className="text-text-secondary">Total</dt>
          <dd>{formatEth(order.total)}</dd>
        </div>
        <div className="flex flex-col pt-3 sm:pl-3 sm:pt-0">
          <dt className="font-bold text-text-secondary">Carteira</dt>
          <dd>{WALLET_PROVIDER_LABELS[order.wallet.provider]}</dd>
        </div>
      </dl>

      <section aria-labelledby="receipt-details" className="flex flex-col gap-3 px-6 pt-6 pb-8 sm:px-11">
        <h2 id="receipt-details" className="text-base font-bold">
          Detalhes da transação
        </h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-[0.5px] border-primary text-base">
              <th scope="col" className="pb-3 font-bold">
                NFTs
              </th>
              <th scope="col" className="pb-3 text-center font-bold">
                Edições
              </th>
              <th scope="col" className="pb-3 text-right font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={`${line.nftId}-${line.editionId}`}>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <NftImage image={line.image} sizes="70px" alt="" className="size-[70px] rounded-sm" />
                    <div className="flex flex-col">
                      <span className="font-bold">{line.name}</span>
                      <span className="text-sm text-text-tertiary">ID do token: {line.tokenId}</span>
                    </div>
                  </div>
                </td>
                <td className="text-center text-text-secondary">(x {line.quantity})</td>
                <td className="text-right text-lg font-bold text-text-accent">{formatEth(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto flex w-full max-w-[320px] flex-col gap-2 border-b-[0.5px] border-primary pb-3 text-[15px]">
          {Number(order.discount) > 0 && (
            <div className="flex justify-between">
              <dt>{order.coupon?.label ?? 'Desconto'}</dt>
              <dd>(-) {formatEth(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Taxa de rede</dt>
            <dd className="text-lg">{formatEth(order.networkFee)}</dd>
          </div>
          <div className="flex justify-between font-bold">
            <dt>Total</dt>
            <dd className="text-lg text-text-accent">{formatEth(order.total)}</dd>
          </div>
        </dl>
        <p className="text-center text-sm leading-[22px] text-text-secondary">
          Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para sua carteira conectada (
          {shortAddress(order.wallet.address)}) e registrada na rede.
        </p>
        {order.explorerUrl && order.transactionHash && (
          <Button asChild className="mx-auto h-12 rounded-md px-4 text-lg">
            <Link to="/explorer/tx/$hash" params={{ hash: order.transactionHash }}>
              Ver no Etherscan
            </Link>
          </Button>
        )}
      </section>
    </article>
  )
}

function PendingState({ order, offline }: { order: Order; offline: boolean }) {
  return (
    <section aria-labelledby="pending-title" className="mx-auto flex w-full max-w-[578px] flex-col items-center gap-5 bg-card px-6 py-10 text-center">
      <span aria-hidden="true" className="size-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary motion-reduce:animate-none" />
      <h1 id="pending-title" className="text-xl font-bold">
        Pagamento em processamento
      </h1>
      <p className="text-text-secondary">
        Aguardando a confirmação da rede {NETWORK_LABELS[order.network]} para o pedido de {formatEth(order.total)}. Você pode fechar esta página: o status é
        recuperado ao voltar.
      </p>
      {offline && (
        <p role="status" className="text-sm text-text-accent">
          Conexão em tempo real indisponível. Verificando o status periodicamente…
        </p>
      )}
      <p className="text-xs text-text-tertiary">Pedido {order.id}</p>
    </section>
  )
}

function RejectedState({ order }: { order: Order }) {
  return (
    <section aria-labelledby="rejected-title" className="mx-auto flex w-full max-w-[578px] flex-col items-center gap-5 border-b-[10px] border-coral bg-card px-6 py-10 text-center">
      <span aria-hidden="true" className="grid size-14 place-items-center rounded-full border-2 border-coral text-3xl text-coral">
        !
      </span>
      <h1 id="rejected-title" className="text-xl font-bold">
        Pagamento recusado
      </h1>
      <p className="text-text-secondary">{order.failureReason ?? 'A transação não foi concluída.'}</p>
      <p className="text-sm">Nenhum valor foi cobrado e os itens continuam no seu carrinho.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/cart">Voltar ao carrinho</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/checkout">Tentar novamente</Link>
        </Button>
      </div>
    </section>
  )
}

export function OrderPage() {
  const { orderId } = route.useParams()
  const user = useCurrentUser()
  const realtime = useRealtimeStatus()
  const offline = realtime !== 'connected'
  const order = useQuery({
    ...orderQueries.detail(user?.id ?? '', orderId),
    enabled: Boolean(user),
    refetchInterval: (query) => (query.state.data?.status === 'pending' && offline ? POLL_WHILE_OFFLINE_MS : false),
  })
  const lastStatus = useRef<string | null>(null)
  const status = order.data?.status

  // Terminal states end the "pending order" guard and are announced once.
  useEffect(() => {
    if (!status || !user || lastStatus.current === status) return
    if (lastStatus.current !== null || status !== 'pending') {
      announce(status === 'confirmed' ? 'Pagamento confirmado. Seus NFTs estão na sua carteira.' : status === 'rejected' ? 'Pagamento recusado.' : '')
    }
    lastStatus.current = status
    if (status !== 'pending') pendingOrder.clear(user.id)
  }, [status, user])

  return (
    <div className="page-container py-10 lg:py-16">
      {order.isPending ? (
        <div role="status" aria-label="Carregando pedido" className="mx-auto flex max-w-[578px] flex-col gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : order.error ? (
        <section role="alert" className="mx-auto flex max-w-[578px] flex-col items-start gap-4">
          <h1 className="text-xl font-bold">{order.error.code === 'NOT_FOUND' ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1>
          <p className="text-text-secondary">{order.error.message}</p>
          {order.error.code !== 'NOT_FOUND' && (
            <Button type="button" onClick={() => void order.refetch()}>
              Tentar novamente
            </Button>
          )}
        </section>
      ) : order.data.status === 'confirmed' ? (
        <Receipt order={order.data} />
      ) : order.data.status === 'rejected' ? (
        <RejectedState order={order.data} />
      ) : (
        <PendingState order={order.data} offline={offline} />
      )}
    </div>
  )
}
