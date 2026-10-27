import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { MobileTopBar } from '@/app/layout/mobile-nav'
import { accountApi, accountQueries } from '@/features/account/api'
import { PriceSummary } from '@/features/cart/components/price-summary'
import { useCart } from '@/features/cart/hooks'
import { checkoutApi, orderQueries } from '@/features/checkout/api'
import { ReviewDialog } from '@/features/checkout/components/review-dialog'
import { WalletPanel } from '@/features/checkout/components/wallet-panel'
import { checkoutDraft, clearAttempt, idempotencyKeyFor, pendingOrder, type CheckoutDraft } from '@/features/checkout/storage'
import { announce } from '@/shared/a11y/announcer'
import type { ApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { NftImage } from '@/shared/components/nft-image'
import { Button } from '@/shared/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Textarea } from '@/shared/components/ui/textarea'
import { ENS_SUFFIXES, type User, type Wallet, type WalletSession } from '@/shared/contracts/account'
import { buyerSchema, quoteSchema, type Buyer, type Quote } from '@/shared/contracts/commerce'
import { NETWORK_LABELS, NETWORKS, WALLET_PROVIDER_LABELS, type Network } from '@/shared/contracts/common'
import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { useCurrentUser } from '@/shared/session/session-store'

const checkoutFormSchema = buyerSchema.extend({
  network: z.enum(NETWORKS, { error: 'Selecione uma rede' }),
  walletId: z.string().min(1, 'Selecione uma carteira'),
})
type CheckoutForm = z.infer<typeof checkoutFormSchema>

const checkoutQuoteKey = (userId: string, network: Network) => [...queryKeys.user.quote(userId, network), 'checkout'] as const

const Required = () => (
  <span aria-hidden="true" className="text-coral">
    *
  </span>
)

function initialValues(user: User, wallets: Wallet[], draft: CheckoutDraft | null): CheckoutForm {
  const primary = wallets[0]
  const wallet = wallets.find((w) => w.id === draft?.walletId) ?? primary
  return {
    displayName: draft?.buyer.displayName ?? user.displayName,
    username: draft?.buyer.username ?? user.username,
    profileName: draft?.buyer.profileName ?? wallet?.profileName ?? '',
    email: draft?.buyer.email ?? user.email,
    referralCode: draft?.buyer.referralCode ?? wallet?.referralCode ?? '',
    ensName: draft?.buyer.ensName ?? user.ensName,
    ensSuffix: draft?.buyer.ensSuffix ?? user.ensSuffix,
    note: draft?.buyer.note ?? '',
    network: (draft?.network ?? wallet?.network ?? '') as Network,
    walletId: wallet?.id ?? '',
  }
}

function ReadOnlyField({ label, value, required }: { label: string; value: string; required?: boolean }) {
  const id = `ro-${label.replace(/\W+/g, '-')}`
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-[15px] leading-4">
        {label} {required && <Required />}
      </label>
      <Input id={id} value={value} readOnly aria-readonly="true" placeholder={label} className="text-text-secondary" />
    </div>
  )
}

function BuyerForm({ form, wallets, onNetworkChange, onWalletChange }: { form: UseFormReturn<CheckoutForm>; wallets: Wallet[]; onNetworkChange: (n: Network) => void; onWalletChange: (id: string) => void }) {
  const walletId = useWatch({ control: form.control, name: 'walletId' })
  const wallet = wallets.find((w) => w.id === walletId)
  const secondary = wallets.find((w) => w.slot === 'secondary')
  const primary = wallets.find((w) => w.slot === 'primary')

  const text = (name: keyof Buyer, label: string, opts: { required?: boolean; type?: string; autoComplete?: string } = {}) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-[15px] leading-4">
            {label} {opts.required && <Required />}
          </FormLabel>
          <FormControl>
            <Input {...field} type={opts.type ?? 'text'} autoComplete={opts.autoComplete} aria-required={opts.required} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <section aria-labelledby="buyer-title" className="flex flex-col gap-5">
      <h2 id="buyer-title" className="text-[17px] leading-4 font-bold">
        Perfil do colecionador
      </h2>
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        {text('displayName', 'Nome de exibição', { required: true, autoComplete: 'name' })}
        {text('username', 'Nome de usuário', { required: true, autoComplete: 'username' })}
        <FormField
          control={form.control}
          name="network"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[15px] leading-4">
                Rede <Required />
              </FormLabel>
              <Select
                value={field.value || undefined}
                onValueChange={(value) => {
                  field.onChange(value)
                  onNetworkChange(value as Network)
                }}
              >
                <FormControl>
                  <SelectTrigger className="h-10 w-full rounded-[2px] border-border" aria-required="true">
                    <SelectValue placeholder="Selecione uma rede" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {NETWORKS.map((network) => (
                    <SelectItem key={network} value={network}>
                      {NETWORK_LABELS[network]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {text('profileName', 'Nome do perfil', { required: true })}
        <ReadOnlyField label="Endereço da carteira" value={wallet?.address ?? ''} required />
        <ReadOnlyField label="ENS ou carteira secundária (opcional)" value={wallet?.secondaryAddress ?? ''} />
        <ReadOnlyField label="Tipo de carteira" value={wallet ? WALLET_PROVIDER_LABELS[wallet.provider] : ''} required />
        {text('referralCode', 'Código de indicação', { required: true })}
        {text('email', 'E-mail', { required: true, type: 'email', autoComplete: 'email' })}
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[15px] leading-4">
            Nome ENS <Required />
          </legend>
          <div className="flex gap-3">
            <FormField
              control={form.control}
              name="ensSuffix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Sufixo ENS</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10 w-[78px] gap-1 rounded-[2px] border-border px-2">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ENS_SUFFIXES.map((suffix) => (
                        <SelectItem key={suffix} value={suffix}>
                          {suffix}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ensName"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only">Nome ENS</FormLabel>
                  <FormControl>
                    <Input {...field} aria-required="true" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>
      </div>

      {secondary && primary && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-[15px]">
          <input
            type="checkbox"
            checked={walletId === secondary.id}
            onChange={(e) => onWalletChange(e.target.checked ? secondary.id : primary.id)}
            className="size-[18px] appearance-none rounded-full border-2 border-primary checked:bg-primary checked:shadow-[inset_0_0_0_3px_var(--ink)]"
          />
          Usar outra carteira?
        </label>
      )}

      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem className="md:w-[350px]">
            <FormLabel className="text-[15px] leading-4">Observação do colecionador (opcional)</FormLabel>
            <FormControl>
              <Textarea {...field} rows={6} className="min-h-[150px] rounded-[2px] border-border" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  )
}

function OrderLines({ quote }: { quote: Quote | undefined }) {
  if (!quote) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-[70px] w-full" />
        ))}
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-3" aria-label="Itens do pedido">
      {quote.lines.map((line) => (
        <li key={line.itemId} className="flex flex-col gap-1">
          <div className="flex h-[70px] items-center gap-2 bg-card pr-4">
            <NftImage image={line.image} sizes="70px" alt="" className="size-[70px]" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base leading-5 font-bold">{line.name}</span>
              <span className="text-sm text-text-tertiary">ID do token: {line.tokenId}</span>
            </div>
            <span className="text-sm text-text-secondary">(x {line.quantity})</span>
            <span className="text-lg font-bold text-text-accent">{formatEth(line.lineTotal)}</span>
          </div>
          {line.status !== 'ok' && (
            <p role="status" className={cn('text-sm', line.status === 'price_changed' ? 'text-text-accent' : 'text-coral')}>
              {line.status === 'price_changed' && line.previousUnitPrice
                ? `Preço atualizado: de ${formatEth(line.previousUnitPrice)} para ${formatEth(line.unitPrice)}.`
                : line.status === 'sold_out'
                  ? `A edição ${line.editionLabel} esgotou. Ajuste o carrinho.`
                  : `Restam apenas ${line.available} unidades. Ajuste o carrinho.`}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

function errorMessage(error: ApiError): { message: string; canRetry: boolean } {
  switch (error.code) {
    case 'TIMEOUT':
    case 'NETWORK_ERROR':
    case 'SERVER_ERROR':
      return {
        message: 'Não recebemos a confirmação do pedido. Tente novamente: a mesma tentativa será reaproveitada, sem duplicar a compra.',
        canRetry: true,
      }
    case 'QUOTE_STALE':
      return { message: 'Preços ou condições mudaram. Revise os novos valores e confirme novamente.', canRetry: false }
    case 'OUT_OF_STOCK':
      return { message: 'Algum item não está mais disponível na quantidade escolhida. Volte ao carrinho para ajustar.', canRetry: false }
    default:
      return { message: error.message, canRetry: false }
  }
}

function CheckoutContent({ user, wallets }: { user: User; wallets: Wallet[] }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const cart = useCart()
  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: initialValues(user, wallets, checkoutDraft.read(user.id)),
  })
  const network = useWatch({ control: form.control, name: 'network' })
  const walletId = useWatch({ control: form.control, name: 'walletId' })
  const [connection, setConnection] = useState<WalletSession | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewedQuote, setReviewedQuote] = useState<Quote | null>(null)
  const [buyer, setBuyer] = useState<Buyer | null>(null)
  const [submitError, setSubmitError] = useState<{ message: string; canRetry: boolean } | null>(null)
  const [lastAttempt, setLastAttempt] = useState<{ payload: { quoteId: string; walletSessionId: string; buyer: Buyer }; key: string } | null>(null)
  const [needsWallet, setNeedsWallet] = useState(false)

  // The draft survives refreshes and session expiry, so the user can resume after logging in again.
  const draftValues = useWatch({ control: form.control })
  useEffect(() => {
    const { network: n, walletId: w, ...rest } = draftValues
    checkoutDraft.write(user.id, { buyer: rest, network: (n as Network) || null, walletId: w || null })
  }, [draftValues, user.id])

  const hasItems = (cart.data?.items.length ?? 0) > 0
  const quote = useQuery({
    queryKey: checkoutQuoteKey(user.id, network || 'ethereum'),
    queryFn: ({ signal }) => checkoutApi.quote(network, signal),
    enabled: Boolean(network) && hasItems,
    staleTime: 0,
  })

  const pendingId = pendingOrder.read(user.id)
  const pending = useQuery({ ...orderQueries.detail(user.id, pendingId ?? ''), enabled: Boolean(pendingId) })
  const hasPendingOrder = pending.data?.status === 'pending'
  useEffect(() => {
    if (pendingId && pending.data && pending.data.status !== 'pending') pendingOrder.clear(user.id)
  }, [pendingId, pending.data, user.id])

  const dropConnection = (reason: string) => {
    if (!connection) return
    void accountApi.disconnectWallet(connection.id).catch(() => undefined)
    setConnection(null)
    announce(reason)
  }

  const createOrder = useMutation({
    mutationFn: ({ payload, key }: { payload: { quoteId: string; walletSessionId: string; buyer: Buyer }; key: string }) =>
      checkoutApi.createOrder(payload, key),
    onSuccess: (order) => {
      pendingOrder.write(user.id, order.id)
      clearAttempt(user.id)
      checkoutDraft.clear(user.id)
      queryClient.setQueryData(queryKeys.user.order(user.id, order.id), order)
      announce('Pedido enviado. Aguardando a confirmação da rede.')
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
    },
    onError: (error) => {
      if ((error.code === 'QUOTE_STALE' || error.code === 'OUT_OF_STOCK') && error.details) {
        const parsed = quoteSchema.safeParse((error.details as { quote?: unknown }).quote)
        if (parsed.success) queryClient.setQueryData(checkoutQuoteKey(user.id, parsed.data.network), parsed.data)
      }
      if (error.code === 'WALLET_DISCONNECTED') setConnection(null)
      const mapped = errorMessage(error)
      setSubmitError(mapped)
      announce(mapped.message)
    },
  })

  const openReview = form.handleSubmit((values) => {
    if (!connection) {
      setNeedsWallet(true)
      document.getElementById('wallet-panel')?.scrollIntoView({ block: 'center' })
      announce('Conecte sua carteira para continuar.')
      return
    }
    const { network: _n, walletId: _w, ...buyerValues } = values
    setBuyer(buyerValues)
    setReviewedQuote(quote.data ?? null)
    setSubmitError(null)
    setReviewOpen(true)
  })

  const confirm = () => {
    // A retry after a lost response resends the exact same attempt (same payload, same key),
    // even if the cart or quote changed meanwhile because that very order already went through.
    if (submitError?.canRetry && lastAttempt) {
      setSubmitError(null)
      createOrder.mutate(lastAttempt)
      return
    }
    if (!quote.data || !connection || !buyer) return
    const payload = { quoteId: quote.data.id, walletSessionId: connection.id, buyer }
    const attempt = { payload, key: idempotencyKeyFor(user.id, payload) }
    setLastAttempt(attempt)
    setReviewedQuote(quote.data)
    setSubmitError(null)
    createOrder.mutate(attempt)
  }
  const attemptInFlight = createOrder.isPending || Boolean(submitError?.canRetry)

  if (cart.isPending) return <Skeleton className="page-container h-96" />
  // While an attempt is in flight or awaiting a retry, the cart may legitimately empty out
  // (the order settled server-side): keep the checkout and its dialog mounted.
  if (!hasItems && !hasPendingOrder && !attemptInFlight) {
    return (
      <section className="page-container flex flex-col items-start gap-4 py-10">
        <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
        <Button asChild>
          <Link to="/" hash="mercado">
            Explorar o mercado
          </Link>
        </Button>
      </section>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={openReview} noValidate className="page-container flex flex-col gap-10 pb-10 lg:flex-row lg:gap-8 lg:pt-8">
        <div className="flex flex-col gap-10 lg:w-[763px]">
          <nav aria-label="Trilha de navegação" className="hidden text-[15px] leading-4 font-bold lg:block">
            <ol className="flex gap-1.5">
              <li>
                <Link to="/">Início</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to="/" hash="mercado">
                  Mercado
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Pagamento</li>
            </ol>
          </nav>
          <h1 className="sr-only">Pagamento</h1>
          {hasPendingOrder && pending.data && (
            <div role="status" className="flex flex-col gap-2 border border-primary px-4 py-3 text-sm">
              <p className="font-bold text-text-accent">Você tem um pedido aguardando confirmação.</p>
              <p>Para evitar compras duplicadas, acompanhe o pedido antes de iniciar outro.</p>
              <Link to="/orders/$orderId" params={{ orderId: pending.data.id }} className="font-bold text-text-accent underline">
                Acompanhar pedido
              </Link>
            </div>
          )}
          <BuyerForm
            form={form}
            wallets={wallets}
            onNetworkChange={(n) => connection && connection.network !== n && dropConnection('Rede alterada: conecte a carteira novamente.')}
            onWalletChange={(id) => {
              form.setValue('walletId', id, { shouldDirty: true })
              dropConnection('Carteira alterada: conecte novamente.')
            }}
          />
        </div>

        <aside aria-label="Resumo do pedido" className="flex flex-col gap-6 lg:w-[405px]">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between border-b-[0.5px] border-primary pb-3 text-[17px] leading-4 font-bold">
              <h2>Seus NFTs</h2>
              <span aria-hidden="true">Subtotal</span>
            </div>
            <OrderLines quote={quote.data} />
            <Link to="/cart" className="text-center text-sm">
              Tem um código promocional? Aplique aqui
            </Link>
          </div>
          <div aria-live="polite">
            {network ? <PriceSummary quote={quote.data} isPending={quote.isPending} /> : <p className="text-sm text-text-secondary">Escolha a rede para calcular a taxa e o total.</p>}
          </div>
          <div id="wallet-panel" className="scroll-mt-24">
            <WalletPanel
              wallets={wallets}
              walletId={walletId}
              onSelectWallet={(id) => form.setValue('walletId', id, { shouldDirty: true })}
              network={network || null}
              connection={connection}
              onConnectionChange={(session) => {
                setConnection(session)
                setNeedsWallet(false)
              }}
            />
            {needsWallet && !connection && (
              <p role="alert" className="mt-2 text-sm text-coral">
                Conecte sua carteira para confirmar a compra.
              </p>
            )}
          </div>
          <Button type="submit" size="lg" className="w-full rounded-md max-lg:h-[60px] max-lg:rounded-[40px]" disabled={hasPendingOrder || !quote.data?.purchasable}>
            Confirmar compra
          </Button>
          {quote.data && !quote.data.purchasable && <p className="text-sm text-coral">Há itens indisponíveis. Ajuste o carrinho para continuar.</p>}
        </aside>

        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          // During an attempt the dialog shows what was sent, not a quote recomputed afterwards.
          quote={attemptInFlight ? (reviewedQuote ?? undefined) : quote.data}
          reviewedQuote={reviewedQuote}
          onAcceptChanges={() => {
            setReviewedQuote(quote.data ?? null)
            setSubmitError(null)
          }}
          buyer={buyer}
          connection={connection}
          onConfirm={confirm}
          isSubmitting={createOrder.isPending}
          error={submitError?.message ?? null}
          canRetry={submitError?.canRetry ?? false}
        />
      </form>
    </Form>
  )
}

export function CheckoutPage() {
  const user = useCurrentUser()
  const wallets = useQuery({ ...accountQueries.wallets(user?.id ?? ''), enabled: Boolean(user) })

  return (
    <div className="flex flex-col">
      <MobileTopBar title="Pagamento com carteira" />
      {!user || wallets.isPending ? (
        <div className="page-container flex flex-col gap-4 py-8" role="status" aria-label="Carregando pagamento">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : wallets.error ? (
        <div role="alert" className="page-container flex flex-col items-start gap-4 py-8">
          <p>{wallets.error.message}</p>
          <Button type="button" onClick={() => void wallets.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <CheckoutContent user={user} wallets={[wallets.data.primary, wallets.data.secondary].filter((w): w is Wallet => Boolean(w))} />
      )}
    </div>
  )
}
