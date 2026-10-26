import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { authApi } from '@/features/auth/api'
import type { AuthSearch } from '@/features/auth/search'
import { useCompleteAuth } from '@/features/auth/use-complete-auth'
import { HomeHero } from '@/features/catalog/components/home-hero'
import { FacebookIcon, GoogleIcon } from '@/shared/components/icons'
import { PasswordInput } from '@/shared/components/password-input'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { loginInputSchema, signupInputSchema, type LoginInput, type SignupInput } from '@/shared/contracts/account'
import { applyApiFieldErrors } from '@/shared/lib/form-errors'
import { notifyUnavailable } from '@/shared/lib/unavailable'
import { cn } from '@/shared/lib/utils'

type Mode = 'login' | 'signup'

const PUBLIC_PREFIXES = ['/nfts/', '/cart', '/explorer/']
const isPublicPath = (path: string | undefined): path is string =>
  Boolean(path && (path === '/' || path.startsWith('/?') || path.startsWith('/#') || PUBLIC_PREFIXES.some((p) => path.startsWith(p))))

const COPY: Record<Mode, { title: string; mobileTitle: string; description: string }> = {
  login: {
    title: 'Entrar',
    mobileTitle: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  signup: {
    title: 'Criar conta',
    mobileTitle: 'Criar perfil de colecionador',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-sm border border-coral/60 px-3 py-2 text-sm text-coral">
      {message}
    </p>
  )
}

function SocialButtons() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-[13px] text-foreground">
        <span className="h-px flex-1 bg-border" />
        Ou continue com
        <span className="h-px flex-1 bg-border" />
      </div>
      <button type="button" onClick={() => notifyUnavailable('O login com Google')} className="flex h-10 items-center justify-center gap-2 rounded-[2px] border border-border text-[13px] font-medium text-text-secondary hover:border-primary">
        <GoogleIcon className="size-5" /> Continuar com Google
      </button>
      <button type="button" onClick={() => notifyUnavailable('O login com Facebook')} className="flex h-10 items-center justify-center gap-2 rounded-[2px] border border-border text-[13px] font-medium text-text-secondary hover:border-primary">
        <FacebookIcon className="size-5" /> Continuar com Facebook
      </button>
    </div>
  )
}

function LoginForm({ search }: { search: AuthSearch }) {
  const completeAuth = useCompleteAuth()
  const form = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema), defaultValues: { email: '', password: '' } })
  const login = useMutation({ mutationFn: authApi.login, onSuccess: (session) => completeAuth(session, search.redirect) })

  const submit = form.handleSubmit((values) =>
    login.mutate(values, { onError: (error) => applyApiFieldErrors(error, form.setError, ['email', 'password']) }),
  )
  const formError = login.error && Object.keys(login.error.fields).length === 0 ? login.error.message : null

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">E-mail</FormLabel>
              <FormControl>
                <Input {...field} type="email" autoComplete="email" placeholder="contato@email.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Senha</FormLabel>
              <FormControl>
                <PasswordInput {...field} autoComplete="current-password" placeholder="Senha" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="button" onClick={() => notifyUnavailable('A recuperação de senha')} className="self-end text-[13px] text-text-accent">
          Esqueceu a senha?
        </button>
        <FormError message={formError} />
        <Button type="submit" size="lg" className="mt-3 rounded-md max-lg:h-[60px] max-lg:rounded-[10px] max-lg:text-lg" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </Form>
  )
}

function SignupForm({ search }: { search: AuthSearch }) {
  const completeAuth = useCompleteAuth()
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupInputSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const signup = useMutation({ mutationFn: authApi.signup, onSuccess: (session) => completeAuth(session, search.redirect) })

  const submit = form.handleSubmit((values) =>
    signup.mutate(values, {
      onError: (error) => applyApiFieldErrors(error, form.setError, ['username', 'email', 'password', 'confirmPassword']),
    }),
  )
  const formError = signup.error && Object.keys(signup.error.fields).length === 0 ? signup.error.message : null

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Nome de usuário</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="username" placeholder="Nome de usuário" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">E-mail</FormLabel>
              <FormControl>
                <Input {...field} type="email" autoComplete="email" placeholder="Digite seu e-mail" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Senha</FormLabel>
              <FormControl describedBy="password-rules">
                <PasswordInput {...field} autoComplete="new-password" placeholder="Senha" />
              </FormControl>
              <p id="password-rules" className="text-xs text-text-tertiary">
                Mínimo de 8 caracteres, com letras e números.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Confirmar senha</FormLabel>
              <FormControl>
                <PasswordInput {...field} autoComplete="new-password" placeholder="Confirmar senha" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormError message={formError} />
        <Button type="submit" size="lg" className="mt-3 rounded-md max-lg:h-[60px] max-lg:rounded-[10px] max-lg:text-lg" disabled={signup.isPending}>
          {signup.isPending ? (
            'Criando conta…'
          ) : (
            <>
              <span className="lg:hidden">Criar perfil</span>
              <span className="max-lg:hidden">Criar conta</span>
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}

/**
 * Login and signup: a modal over the home on desktop (Figma), a full screen with the
 * logo on phones. Closing returns to where the user came from.
 */
export function AuthDialog({ mode, search }: { mode: Mode; search: AuthSearch }) {
  const router = useRouter()
  const copy = COPY[mode]
  // Dismissing returns to a public origin; private origins would just bounce back here.
  const close = () => void router.navigate({ href: isPublicPath(search.redirect) ? search.redirect : '/', replace: true })

  return (
    <>
      <div aria-hidden="true" className="hidden pt-8 lg:block">
        <HomeHero />
      </div>
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent
          className={cn(
            'max-lg:inset-0 max-lg:top-0 max-lg:left-0 max-lg:h-dvh max-lg:max-w-none max-lg:translate-x-0 max-lg:translate-y-0 max-lg:overflow-y-auto max-lg:rounded-none max-lg:border-0',
            'gap-6 border-0 bg-background px-7 pt-8 pb-10 sm:max-w-[500px] lg:rounded-none lg:border-b-[10px] lg:border-primary lg:bg-card lg:px-20',
            '[&_input]:max-lg:h-[50px] [&_input]:max-lg:rounded-[10px]',
          )}
        >
          <p aria-hidden="true" className="pt-16 pb-10 text-center text-[32px] leading-[42px] font-bold tracking-[3.2px] lg:hidden">
            KURIO
          </p>
          <div className="flex flex-col items-center gap-6 text-center">
            <DialogTitle className="sr-only">{copy.title}</DialogTitle>
            <nav aria-label="Acesso à conta" className="hidden items-center gap-2 text-xl font-medium lg:flex">
              <Link to="/login" search={search} replace className={cn(mode === 'login' ? 'text-text-accent' : 'text-foreground')} aria-current={mode === 'login' ? 'page' : undefined}>
                Entrar
              </Link>
              <span aria-hidden="true" className="h-6 w-px bg-primary" />
              <Link to="/signup" search={search} replace className={cn(mode === 'signup' ? 'text-text-accent' : 'text-foreground')} aria-current={mode === 'signup' ? 'page' : undefined}>
                Criar conta
              </Link>
            </nav>
            <p aria-hidden="true" className="text-xl font-bold lg:hidden">
              {copy.mobileTitle}
            </p>
            <DialogDescription className="text-[13px] text-foreground">{copy.description}</DialogDescription>
            {search.reason === 'expired' && (
              <p role="status" className="w-full rounded-sm border border-primary/60 px-3 py-2 text-left text-sm text-text-accent">
                Sua sessão expirou. Entre novamente para continuar de onde parou.
              </p>
            )}
          </div>

          {mode === 'login' ? <LoginForm search={search} /> : <SignupForm search={search} />}
          <SocialButtons />

          <p className="text-center text-[15px] text-text-secondary lg:hidden">
            {mode === 'login' ? (
              <Link to="/signup" search={search} replace>
                Novo na Kurio? Crie uma conta
              </Link>
            ) : (
              <Link to="/login" search={search} replace>
                Já tem uma conta? Entre
              </Link>
            )}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
