import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { z } from 'zod'
import { FacebookBoxIcon, InstagramBoxIcon, LinkedinBoxIcon, TwitterBoxIcon, YoutubeBoxIcon } from '@/shared/components/icons'
import { CATEGORY_LABELS, type Category } from '@/shared/contracts/common'
import { notifyUnavailable } from '@/shared/lib/unavailable'
import { cn } from '@/shared/lib/utils'

const SERVICES = [
  { mark: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { mark: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { mark: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const SOCIAL = [
  { label: 'Facebook', Icon: FacebookBoxIcon },
  { label: 'Instagram', Icon: InstagramBoxIcon },
  { label: 'Twitter', Icon: TwitterBoxIcon },
  { label: 'LinkedIn', Icon: LinkedinBoxIcon },
  { label: 'YouTube', Icon: YoutubeBoxIcon },
]

type FooterLink = { label: string; to?: '/account/profile' | '/favorites' | '/account/wallets'; category?: Category }

const COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/account/profile' },
      { label: 'Minha coleção' },
      { label: 'Atividade' },
      { label: 'Estúdio do criador' },
      { label: 'Lista de interesse', to: '/favorites' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda' },
      { label: 'Como comprar NFTs' },
      { label: 'Carteira e segurança', to: '/account/wallets' },
      { label: 'Política do mercado' },
      { label: 'Reportar um problema' },
    ],
  },
  {
    title: 'Coleções',
    links: (['arte-digital', 'fotografia', 'musica', 'arte-3d', 'utilidade'] as const).map((category) => ({
      label: CATEGORY_LABELS[category],
      category,
    })),
  },
]

function Newsletter() {
  const inputId = useId()
  const hintId = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!z.email().safeParse(email.trim()).success) {
      setError('Informe um e-mail válido.')
      return
    }
    setError(null)
    setEmail('')
    // No newsletter service exists in this demo; say so instead of faking a subscription.
    notifyUnavailable('A inscrição em novidades')
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <label htmlFor={inputId} className="text-lg leading-4 font-bold">
        Antecipe-se ao próximo lançamento
      </label>
      <div className="flex h-10 overflow-hidden rounded-md bg-surface-dark shadow-card">
        <input
          id={inputId}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="digite seu e-mail..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? hintId : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm placeholder:text-text-tertiary focus-visible:outline-offset-[-2px]"
        />
        <button type="submit" className="bg-primary px-4 text-lg font-bold text-ink hover:bg-brand-amber">
          Enviar
        </button>
      </div>
      {error && (
        <p id={hintId} role="alert" className="text-sm text-coral">
          {error}
        </p>
      )}
      <p className="text-[13px] leading-[22px] text-text-secondary">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </form>
  )
}

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('page-container mt-16 pb-6 lg:mt-24', className)}>
      <section aria-label="Serviços Kurio" className="grid grid-cols-1 gap-8 bg-card p-5 break-words sm:p-8 md:grid-cols-2 lg:grid-cols-[repeat(3,1fr)_1.35fr] lg:gap-0">
        {SERVICES.map((service) => (
          <div key={service.mark} className="flex flex-col gap-3 lg:border-r lg:border-primary lg:px-4">
            <span aria-hidden="true" className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-ink">
              {service.mark}
            </span>
            <h2 className="text-[17px] leading-4 font-bold">{service.title}</h2>
            <p className="max-w-[204px] text-sm leading-[22px] text-text-secondary">{service.text}</p>
          </div>
        ))}
        <div className="lg:px-4">
          <Newsletter />
        </div>
      </section>

      <div className="flex flex-col gap-4 bg-surface-dark p-5 text-sm break-words sm:p-8 leading-[22px] md:flex-row md:items-center md:justify-between">
        <Link to="/" className="text-sm font-bold tracking-[1.4px]" aria-label="Kurio, página inicial">
          KURIO
        </Link>
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com">contato@email.com</a>
        <a href="tel:+551140028922">+55 11 4002 8922</a>
      </div>

      <div className="grid grid-cols-1 gap-10 bg-card p-5 break-words sm:grid-cols-2 sm:p-8 lg:grid-cols-[repeat(3,1fr)_auto] lg:gap-[124px]">
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2">
            <h2 className="text-lg leading-4 font-bold">{column.title}</h2>
            <ul className="text-sm leading-[30px]">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.category ? (
                    <Link to="/" search={{ category: [link.category] }} hash="mercado" className="hover:text-text-accent">
                      {link.label}
                    </Link>
                  ) : link.to ? (
                    <Link to={link.to} className="hover:text-text-accent">
                      {link.label}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => notifyUnavailable(link.label)} className="hover:text-text-accent">
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <h2 className="text-lg leading-4 font-bold">Redes sociais</h2>
            <ul className="flex gap-2.5 text-primary">
              {SOCIAL.map(({ label, Icon }) => (
                <li key={label}>
                  <button type="button" onClick={() => notifyUnavailable(`O perfil no ${label}`)} aria-label={`Kurio no ${label}`} className="rounded-sm">
                    <Icon className="size-[30px]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg leading-4 font-bold">Carteiras compatíveis</h2>
            <p className="w-fit rounded-md border border-border-soft bg-surface-dark px-2 py-1 text-[9px] leading-[18px] font-bold tracking-[0.1px] text-text-accent">
              METAMASK • WALLETCONNECT • COINBASE
            </p>
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
