import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useRouter } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { accountApi, accountQueries } from '@/features/account/api'
import { AccountLayout } from '@/features/account/components/account-layout'
import { announce } from '@/shared/a11y/announcer'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ENS_SUFFIXES, walletInputSchema, type User, type Wallet, type WalletInput, type WalletSlot } from '@/shared/contracts/account'
import { NETWORK_LABELS, NETWORKS, WALLET_PROVIDER_LABELS, WALLET_PROVIDERS } from '@/shared/contracts/common'
import { applyApiFieldErrors } from '@/shared/lib/form-errors'
import { shortAddress } from '@/shared/lib/format'
import { useCurrentUser } from '@/shared/session/session-store'

const route = getRouteApi('/_auth/account/wallets')

const Required = () => (
  <span aria-hidden="true" className="text-coral">
    *
  </span>
)

const FIELDS = ['displayName', 'nickname', 'network', 'profileName', 'address', 'secondaryAddress', 'provider', 'referralCode', 'email', 'ensName', 'ensSuffix'] as const

/** Network and wallet type start unselected (the selects show their placeholders). */
function emptyWallet(user: User): Partial<WalletInput> {
  return {
    displayName: user.displayName,
    nickname: '',
    profileName: '',
    address: '',
    secondaryAddress: '',
    referralCode: '',
    email: user.email,
    ensName: user.ensName,
    ensSuffix: user.ensSuffix,
  }
}

function toInput({ id: _id, slot: _slot, updatedAt: _u, ...input }: Wallet): WalletInput {
  return input
}

function WalletForm({ slot, initial, onSaved, onCancel }: { slot: WalletSlot; initial: Partial<WalletInput>; onSaved: () => void; onCancel?: () => void }) {
  const user = useCurrentUser()!
  const queryClient = useQueryClient()
  const form = useForm<WalletInput>({ resolver: zodResolver(walletInputSchema), defaultValues: initial })
  const save = useMutation({
    mutationFn: (values: WalletInput) => accountApi.saveWallet(slot, values),
    onSuccess: (wallets) => {
      queryClient.setQueryData(queryKeys.user.wallets(user.id), wallets)
      const message = slot === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.'
      toast.success(message)
      announce(message)
      onSaved()
    },
    onError: (error) => {
      if (!applyApiFieldErrors(error, form.setError, FIELDS)) toast.error(error.message)
    },
  })

  const text = (name: Exclude<(typeof FIELDS)[number], 'network' | 'provider' | 'ensSuffix'>, label: string, opts: { required?: boolean; placeholder?: string; type?: string } = {}) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-[15px] leading-4">
            {label} {opts.required && <Required />}
          </FormLabel>
          <FormControl>
            <Input {...field} type={opts.type ?? 'text'} placeholder={opts.placeholder} aria-required={opts.required} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const select = <T extends string>(name: 'network' | 'provider', label: string, options: readonly T[], labels: Record<T, string>, placeholder: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-[15px] leading-4">
            {label} <Required />
          </FormLabel>
          <Select value={field.value || undefined} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="h-10 w-full rounded-[2px] border-border" aria-required="true">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {labels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-6">
        <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
          {text('displayName', 'Nome de exibição', { required: true })}
          {text('nickname', 'Apelido da carteira', { required: true })}
          {select('network', 'Rede', NETWORKS, NETWORK_LABELS, 'Selecione uma rede')}
          {text('profileName', 'Nome do perfil', { required: true })}
          {text('address', 'Endereço da carteira', { required: true, placeholder: 'Endereço 0x da carteira' })}
          {text('secondaryAddress', 'ENS ou carteira secundária (opcional)', { placeholder: 'ENS ou carteira secundária (opcional)' })}
          {select('provider', 'Tipo de carteira', WALLET_PROVIDERS, WALLET_PROVIDER_LABELS, 'Selecione uma carteira')}
          {text('referralCode', 'Código de indicação', { required: true })}
          {text('email', 'E-mail', { required: true, type: 'email' })}
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
        <div className="flex gap-3">
          <Button type="submit" className="h-10 w-[131px] px-0" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar carteira'}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

function WalletSummary({ wallet }: { wallet: Wallet }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-[10px] bg-card p-5 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-text-tertiary">Apelido</dt>
        <dd className="font-bold">{wallet.nickname}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">Endereço</dt>
        <dd className="font-mono">{shortAddress(wallet.address)}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">Rede</dt>
        <dd>{NETWORK_LABELS[wallet.network]}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">Tipo de carteira</dt>
        <dd>{WALLET_PROVIDER_LABELS[wallet.provider]}</dd>
      </div>
    </dl>
  )
}

export function WalletsPage() {
  const user = useCurrentUser()!
  const router = useRouter()
  const { redirect } = route.useSearch()
  const wallets = useQuery(accountQueries.wallets(user.id))
  const [editing, setEditing] = useState<WalletSlot | null>(null)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const sameId = useId()

  const afterSave = (slot: WalletSlot) => {
    setEditing(null)
    // Coming from the checkout without a wallet: return there once the primary wallet exists.
    if (slot === 'primary' && redirect) void router.navigate({ href: redirect })
  }

  if (wallets.isPending) {
    return (
      <AccountLayout active="wallets" title="Carteiras">
        <div role="status" aria-label="Carregando carteiras" className="flex flex-col gap-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64" />
        </div>
      </AccountLayout>
    )
  }
  if (wallets.error) {
    return (
      <AccountLayout active="wallets" title="Carteiras">
        <div role="alert" className="flex flex-col items-start gap-4">
          <p>{wallets.error.message}</p>
          <Button type="button" onClick={() => void wallets.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </AccountLayout>
    )
  }

  const { primary, secondary } = wallets.data
  const editPrimary = editing === 'primary' || !primary
  const editSecondary = editing === 'secondary'

  return (
    <AccountLayout active="wallets" title="Carteiras">
      <div className="flex flex-col gap-12">
        <section aria-labelledby="primary-title" className="flex flex-col gap-6">
          <header className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 id="primary-title" className="text-[17px] leading-4 font-bold">
                Carteira principal
              </h1>
              <p className="text-sm text-text-secondary">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
            </div>
            {primary && !editPrimary && (
              <button type="button" className="text-lg font-bold text-text-accent" onClick={() => setEditing('primary')}>
                Editar
              </button>
            )}
          </header>
          {editPrimary ? (
            <WalletForm
              key={`primary-${primary?.updatedAt ?? 'new'}`}
              slot="primary"
              initial={primary ? toInput(primary) : emptyWallet(user)}
              onSaved={() => afterSave('primary')}
              onCancel={primary ? () => setEditing(null) : undefined}
            />
          ) : (
            <WalletSummary wallet={primary} />
          )}
        </section>

        <section aria-labelledby="secondary-title" className="flex flex-col gap-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h2 id="secondary-title" className="text-[17px] leading-4 font-bold">
                Carteira secundária
              </h2>
              {!secondary && !editSecondary && <p className="text-sm text-text-secondary">Você ainda não adicionou uma carteira secundária.</p>}
            </div>
            {!editSecondary && primary && (
              <div className="flex items-center gap-4">
                {!secondary && (
                  <label htmlFor={sameId} className="flex cursor-pointer items-center gap-2 text-[15px]">
                    <input
                      id={sameId}
                      type="checkbox"
                      checked={sameAsPrimary}
                      onChange={(e) => setSameAsPrimary(e.target.checked)}
                      className="size-[18px] appearance-none rounded-full border-2 border-primary checked:bg-primary checked:shadow-[inset_0_0_0_3px_var(--ink)]"
                    />
                    Igual à carteira principal
                  </label>
                )}
                <button type="button" className="text-lg font-bold text-text-accent" onClick={() => setEditing('secondary')}>
                  {secondary ? 'Editar' : 'Adicionar'}
                </button>
              </div>
            )}
          </header>
          {!primary && <p className="text-sm text-text-tertiary">Cadastre a carteira principal antes de adicionar uma secundária.</p>}
          {editSecondary ? (
            <WalletForm
              key={`secondary-${secondary?.updatedAt ?? 'new'}`}
              slot="secondary"
              initial={secondary ? toInput(secondary) : sameAsPrimary && primary ? { ...toInput(primary), nickname: `${primary.nickname} (cópia)`, address: '' } : emptyWallet(user)}
              onSaved={() => afterSave('secondary')}
              onCancel={() => setEditing(null)}
            />
          ) : (
            secondary && <WalletSummary wallet={secondary} />
          )}
        </section>
      </div>
    </AccountLayout>
  )
}
