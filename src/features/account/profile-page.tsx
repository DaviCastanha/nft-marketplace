import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { accountApi, accountQueries } from '@/features/account/api'
import { AccountLayout } from '@/features/account/components/account-layout'
import { announce } from '@/shared/a11y/announcer'
import { queryKeys } from '@/shared/api/query-keys'
import { ImagePlaceholderIcon } from '@/shared/components/icons'
import { PasswordInput } from '@/shared/components/password-input'
import { Button } from '@/shared/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ENS_SUFFIXES, passwordSchema, profileInputSchema, type User } from '@/shared/contracts/account'
import { applyApiFieldErrors } from '@/shared/lib/form-errors'
import { ImageInputError, resizeImageToDataUrl } from '@/shared/lib/resize-image'
import { sessionStore, useCurrentUser } from '@/shared/session/session-store'

/** Profile data plus an optional password change, saved together by "Salvar" (as in the frame). */
const profileFormSchema = profileInputSchema
  .extend({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    const changing = Boolean(values.currentPassword || values.newPassword || values.confirmPassword)
    if (!changing) return
    if (!values.currentPassword) ctx.addIssue({ code: 'custom', path: ['currentPassword'], message: 'Informe a senha atual' })
    const strength = passwordSchema.safeParse(values.newPassword)
    if (!strength.success) ctx.addIssue({ code: 'custom', path: ['newPassword'], message: strength.error.issues[0]!.message })
    else if (values.newPassword === values.currentPassword) {
      ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'A nova senha deve ser diferente da atual' })
    }
    if (values.confirmPassword !== values.newPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não conferem' })
  })
type ProfileForm = z.infer<typeof profileFormSchema>

const Required = () => (
  <span aria-hidden="true" className="text-coral">
    *
  </span>
)

function AvatarField({ user }: { user: User }) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const onSaved = (next: User) => {
    sessionStore.updateUser(next)
    queryClient.setQueryData(queryKeys.user.profile(next.id), next)
  }
  const upload = useMutation({
    mutationFn: async (file: File) => accountApi.uploadAvatar({ dataUrl: await resizeImageToDataUrl(file) }),
    onSuccess: (next) => {
      onSaved(next)
      setError(null)
      announce('Avatar atualizado.')
      toast.success('Avatar atualizado.')
    },
    onError: (err) => {
      const message = err instanceof ImageInputError ? err.message : err.message
      setError(message)
      announce(message)
    },
  })
  const remove = useMutation({
    mutationFn: accountApi.removeAvatar,
    onSuccess: (next) => {
      onSaved(next)
      announce('Avatar removido.')
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] leading-4">Avatar</p>
      <div className="flex items-center gap-6">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="Seu avatar atual" className="size-[50px] rounded-full object-cover" />
        ) : (
          <span role="img" aria-label="Sem avatar">
            <ImagePlaceholderIcon className="size-[50px]" />
          </span>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Escolher imagem de avatar"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload.mutate(file)
            e.target.value = ''
          }}
        />
        <Button type="button" className="h-10 w-[98px] px-0" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        <button
          type="button"
          className="text-[15px] font-medium hover:text-text-accent disabled:opacity-50"
          onClick={() => remove.mutate()}
          disabled={!user.avatarUrl || remove.isPending}
        >
          Remover
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

function ProfileFormView({ user }: { user: User }) {
  const queryClient = useQueryClient()
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user.displayName,
      username: user.username,
      email: user.email,
      ensName: user.ensName,
      ensSuffix: user.ensSuffix,
      walletNickname: user.walletNickname,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const save = useMutation({
    mutationFn: async ({ currentPassword, newPassword, confirmPassword, ...profile }: ProfileForm) => {
      const updated = await accountApi.updateProfile(profile)
      sessionStore.updateUser(updated)
      queryClient.setQueryData(queryKeys.user.profile(updated.id), updated)
      if (newPassword) await accountApi.changePassword({ currentPassword, newPassword, confirmPassword })
      return { updated, passwordChanged: Boolean(newPassword) }
    },
    onSuccess: ({ updated, passwordChanged }) => {
      form.reset({ ...form.getValues(), ...updated, currentPassword: '', newPassword: '', confirmPassword: '' })
      const message = passwordChanged ? 'Perfil e senha atualizados.' : 'Perfil atualizado.'
      toast.success(message)
      announce(message)
    },
    onError: (error) => {
      const mapped = applyApiFieldErrors(error, form.setError, [
        'displayName',
        'username',
        'email',
        'ensName',
        'ensSuffix',
        'walletNickname',
        'currentPassword',
        'newPassword',
        'confirmPassword',
      ])
      if (!mapped) toast.error(error.message)
    },
  })

  const field = (name: 'displayName' | 'username' | 'email' | 'walletNickname', label: string, type = 'text', autoComplete?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field: f }) => (
        <FormItem>
          <FormLabel className="text-[15px] leading-4">
            {label} <Required />
          </FormLabel>
          <FormControl>
            <Input {...f} type={type} autoComplete={autoComplete} aria-required="true" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const password = (name: 'currentPassword' | 'newPassword' | 'confirmPassword', label: string, autoComplete: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field: f }) => (
        <FormItem>
          <FormLabel className="text-[15px] leading-4">{label}</FormLabel>
          <FormControl>
            <PasswordInput {...f} autoComplete={autoComplete} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-8">
        <h1 className="text-[17px] leading-4 font-bold">Perfil do colecionador</h1>
        <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
          {field('displayName', 'Nome de exibição', 'text', 'name')}
          {field('username', 'Nome de usuário', 'text', 'username')}
          {field('email', 'E-mail', 'email', 'email')}
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-[15px] leading-4">
              Nome ENS <Required />
            </legend>
            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="ensSuffix"
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Sufixo ENS</FormLabel>
                    <Select value={f.value} onValueChange={f.onChange}>
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
                render={({ field: f }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Nome ENS</FormLabel>
                    <FormControl>
                      <Input {...f} aria-required="true" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </fieldset>
          {field('walletNickname', 'Apelido da carteira')}
          <AvatarField user={user} />
        </div>

        <fieldset className="flex flex-col gap-5 md:w-[417px]">
          <legend className="mb-5 text-[17px] leading-4 font-bold">Alterar senha</legend>
          {password('currentPassword', 'Senha atual', 'current-password')}
          {password('newPassword', 'Nova senha', 'new-password')}
          {password('confirmPassword', 'Confirmar nova senha', 'new-password')}
        </fieldset>

        <Button type="submit" className="h-10 w-[131px]" disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
    </Form>
  )
}

export function ProfilePage() {
  const sessionUser = useCurrentUser()
  const profile = useQuery({ ...accountQueries.profile(sessionUser?.id ?? ''), enabled: Boolean(sessionUser) })

  return (
    <AccountLayout active="profile" title="Perfil">
      {profile.isPending ? (
        <div role="status" aria-label="Carregando perfil" className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : profile.error ? (
        <div role="alert" className="flex flex-col items-start gap-4">
          <p>{profile.error.message}</p>
          <Button type="button" onClick={() => void profile.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <ProfileFormView key={profile.data.id} user={profile.data} />
      )}
    </AccountLayout>
  )
}
