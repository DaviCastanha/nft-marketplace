import { NETWORK_LABELS, WALLET_PROVIDER_LABELS } from '@/shared/contracts/common'
import type { WalletSession } from '@/shared/contracts/account'
import type { Buyer, Quote } from '@/shared/contracts/commerce'
import { PriceSummary } from '@/features/cart/components/price-summary'
import { NftImage } from '@/shared/components/nft-image'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { formatEth } from '@/shared/lib/money'
import { shortAddress } from '@/shared/lib/format'
import { quoteChanges } from '@/features/checkout/quote-diff'

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote | undefined
  reviewedQuote: Quote | null
  onAcceptChanges: () => void
  buyer: Buyer | null
  connection: WalletSession | null
  onConfirm: () => void
  isSubmitting: boolean
  error: string | null
  canRetry: boolean
}

export function ReviewDialog({ open, onOpenChange, quote, reviewedQuote, onAcceptChanges, buyer, connection, onConfirm, isSubmitting, error, canRetry }: ReviewDialogProps) {
  // A retry resends the previous attempt as-is, so differences and blocking do not apply to it.
  const changes = !canRetry && quote && reviewedQuote && quote.id !== reviewedQuote.id ? quoteChanges(reviewedQuote, quote) : []
  const needsAcceptance = changes.length > 0
  const blocked = !canRetry && !quote?.purchasable

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto bg-card sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Revise seu pedido</DialogTitle>
          <DialogDescription>Os valores abaixo vêm da cotação mais recente da API e serão revalidados ao confirmar.</DialogDescription>
        </DialogHeader>

        {needsAcceptance && (
          <div role="alert" className="flex flex-col gap-2 rounded-sm border border-primary px-4 py-3 text-sm">
            <p className="font-bold text-text-accent">Os valores mudaram desde que você abriu a revisão:</p>
            <ul className="list-disc pl-5">
              {changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
            {!blocked && (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onAcceptChanges}>
                Revisei os novos valores
              </Button>
            )}
          </div>
        )}

        {quote && (
          <ul className="flex flex-col gap-3" aria-label="Itens do pedido">
            {quote.lines.map((line) => (
              <li key={line.itemId} className="flex items-center gap-3">
                <NftImage image={line.image} sizes="56px" alt="" className="size-14 rounded-md" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">{line.name}</span>
                  <span className="text-sm text-text-tertiary">
                    Edição {line.editionLabel} · {line.quantity} × {formatEth(line.unitPrice)}
                  </span>
                </div>
                <span className="font-bold text-text-accent">{formatEth(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}
        <PriceSummary quote={quote} isPending={!quote} />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-border pt-4 text-sm">
          <dt className="text-text-tertiary">Colecionador</dt>
          <dd>
            {buyer?.displayName} (@{buyer?.username})
          </dd>
          <dt className="text-text-tertiary">E-mail</dt>
          <dd>{buyer?.email}</dd>
          <dt className="text-text-tertiary">Carteira</dt>
          <dd>{connection ? `${WALLET_PROVIDER_LABELS[connection.provider]} ${shortAddress(connection.address)}` : '—'}</dd>
          <dt className="text-text-tertiary">Rede</dt>
          <dd>{connection ? NETWORK_LABELS[connection.network] : '—'}</dd>
        </dl>

        {error && (
          <p role="alert" className="rounded-sm border border-coral/60 px-3 py-2 text-sm text-coral">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Voltar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting || needsAcceptance || blocked || (!connection && !canRetry)}>
            {isSubmitting ? 'Confirmando…' : canRetry ? 'Tentar novamente' : 'Confirmar e pagar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
