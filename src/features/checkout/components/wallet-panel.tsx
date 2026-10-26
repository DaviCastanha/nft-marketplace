import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { accountApi } from '@/features/account/api'
import { announce } from '@/shared/a11y/announcer'
import { WalletIcon } from '@/shared/components/icons'
import { Button } from '@/shared/components/ui/button'
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, type Network } from '@/shared/contracts/common'
import type { Wallet, WalletSession } from '@/shared/contracts/account'
import { shortAddress } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

interface WalletPanelProps {
  wallets: Array<Wallet>
  walletId: string | null
  onSelectWallet: (walletId: string) => void
  network: Network | null
  connection: WalletSession | null
  onConnectionChange: (session: WalletSession | null) => void
}

/**
 * Saved wallets (mobile frame "Carteira conectada") plus the simulated connection:
 * the "extension" approves or rejects, and the user can disconnect at any time.
 */
export function WalletPanel({ wallets, walletId, onSelectWallet, network, connection, onConnectionChange }: WalletPanelProps) {
  const groupLabel = useId()
  const connect = useMutation({
    mutationFn: () => accountApi.connectWallet({ walletId: walletId!, network: network! }),
    onSuccess: (session) => {
      onConnectionChange(session)
      announce(`Carteira ${WALLET_PROVIDER_LABELS[session.provider]} conectada na rede ${NETWORK_LABELS[session.network]}.`)
    },
    onError: (error) => announce(error.message),
  })
  const disconnect = useMutation({
    mutationFn: (sessionId: string) => accountApi.disconnectWallet(sessionId),
    onSettled: () => {
      onConnectionChange(null)
      announce('Carteira desconectada.')
    },
  })

  if (wallets.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-[10px] bg-card p-5">
        <p className="font-bold">Nenhuma carteira cadastrada</p>
        <p className="text-sm text-text-secondary">Cadastre sua carteira principal para concluir a compra.</p>
        <Button asChild variant="outline" className="w-fit">
          <Link to="/account/wallets" search={{ redirect: '/checkout' }}>
            Cadastrar carteira
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id={groupLabel} className="text-[17px] leading-4 font-bold">
          Carteira e rede
        </h2>
        <Link to="/account/wallets" className="text-sm font-bold text-text-accent">
          Gerenciar carteiras
        </Link>
      </div>
      <div role="radiogroup" aria-labelledby={groupLabel} className="flex flex-col gap-3">
        {wallets.map((wallet) => {
          const selected = wallet.id === walletId
          return (
            <button
              key={wallet.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={Boolean(connection)}
              onClick={() => onSelectWallet(wallet.id)}
              className={cn(
                'flex items-center gap-4 rounded-[10px] border bg-card p-4 text-left transition-colors disabled:cursor-not-allowed motion-reduce:transition-none',
                selected ? 'border-primary' : 'border-transparent hover:border-border-soft',
              )}
            >
              <span aria-hidden="true" className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', selected ? 'border-primary' : 'border-text-tertiary')}>
                {selected && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-bold">
                  {wallet.slot === 'primary' ? 'Principal' : 'Secundária'} · {wallet.nickname}
                </span>
                <span className="text-sm text-text-secondary">
                  {WALLET_PROVIDER_LABELS[wallet.provider]} · {shortAddress(wallet.address)}
                </span>
                <span className="text-sm text-text-tertiary">Rede cadastrada: {NETWORK_LABELS[wallet.network]}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-[10px] border border-border p-4" aria-live="polite">
        {connection ? (
          <>
            <p className="flex items-center gap-2 text-sm">
              <span aria-hidden="true" className="size-2 rounded-full bg-success" />
              <span>
                <strong>Conectada:</strong> {WALLET_PROVIDER_LABELS[connection.provider]} {shortAddress(connection.address)} na rede{' '}
                {NETWORK_LABELS[connection.network]}
              </span>
            </p>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => disconnect.mutate(connection.id)} disabled={disconnect.isPending}>
              Desconectar carteira
            </Button>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm text-text-secondary">
              <WalletIcon className="size-5 text-text-accent" />
              {network ? 'Conecte a carteira selecionada para autorizar o pagamento.' : 'Escolha a rede no formulário para conectar.'}
            </p>
            {connect.error && (
              <p role="alert" className="text-sm text-coral">
                {connect.error.message} Você pode tentar novamente ou escolher outra carteira.
              </p>
            )}
            <Button type="button" className="w-fit" onClick={() => connect.mutate()} disabled={!walletId || !network || connect.isPending}>
              {connect.isPending ? 'Aguardando aprovação na carteira…' : 'Conectar carteira'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
