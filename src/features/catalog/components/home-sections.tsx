import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { catalogQueries } from '@/features/catalog/api'
import { ArrowRightIcon } from '@/shared/components/icons'
import { NftImage } from '@/shared/components/nft-image'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatEth } from '@/shared/lib/money'
import { notifyUnavailable } from '@/shared/lib/unavailable'

/** "NFT EM DESTAQUE / OFERTA LIMITADA" banner under the filters (Figma "Featured NFT Banner"). */
export function FeaturedSpotlight() {
  const featured = useQuery(catalogQueries.featured())
  const nft = featured.data?.spotlight

  return (
    <section aria-labelledby="spotlight-title" className="hidden flex-col gap-4 bg-gradient-to-b from-primary/10 to-primary/[0.03] pt-6 lg:flex">
      <div className="flex flex-col gap-4 px-5">
        <h2 id="spotlight-title" className="text-2xl leading-8 font-bold text-text-accent">
          NFT EM DESTAQUE
        </h2>
        <p className="text-center text-[22px] leading-4 font-bold">OFERTA LIMITADA</p>
      </div>
      {nft ? (
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          aria-label={`${nft.name}, ${formatEth(nft.price)}: ver oferta em destaque`}
          className="block overflow-hidden rounded-[22px]"
        >
          <NftImage image={nft.image} sizes="310px" className="h-[368px] w-full" alt="" />
        </Link>
      ) : (
        <Skeleton className="h-[368px] w-full rounded-[22px]" />
      )}
    </section>
  )
}

const PROMOS = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    artwork: 'emerald',
    search: { tab: 'new' as const },
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura on-chain.',
    artwork: 'baron',
    search: { category: ['arte-digital' as const] },
  },
]

export function PromoCards() {
  return (
    <section aria-label="Coleções em destaque" className="page-container grid gap-7 md:grid-cols-2">
      {PROMOS.map((promo) => (
        <article key={promo.artwork} className="relative flex min-h-[250px] overflow-hidden rounded-lg bg-card">
          <img
            src={`/nfts/${promo.artwork}-320.webp`}
            srcSet={`/nfts/${promo.artwork}-320.webp 320w, /nfts/${promo.artwork}-640.webp 640w`}
            sizes="(min-width: 768px) 292px, 45vw"
            width={292}
            height={250}
            alt=""
            loading="lazy"
            className="w-[45%] shrink-0 rounded-[18px] object-cover"
          />
          <div className="flex flex-1 flex-col items-end justify-center gap-3 p-5 text-right sm:pr-[30px]">
            <h2 className="text-lg leading-6 font-bold">
              {promo.title[0]}
              <br />
              {promo.title[1]}
            </h2>
            <p className="max-w-[263px] text-sm leading-6 text-text-secondary">{promo.text}</p>
            <Button asChild className="h-10 w-[140px] rounded-md font-medium">
              <Link to="/" search={promo.search} hash="mercado">
                Explorar <ArrowRightIcon className="size-[18px]" />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS = [
  { date: '12 de setembro', read: '6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.', artwork: 'baron' },
  { date: '13 de setembro', read: '2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.', artwork: 'emerald' },
  { date: '15 de setembro', read: '3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.', artwork: 'nomad' },
  { date: '15 de setembro', read: '2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.', artwork: 'golden' },
]

export function MintJournal() {
  return (
    <section aria-labelledby="journal-title" className="page-container flex flex-col gap-10">
      <header className="flex flex-col gap-3 text-center">
        <h2 id="journal-title" className="text-[28px] leading-[37px] font-bold">
          Diário da Cunhagem
        </h2>
        <p className="text-sm leading-[18px] text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-lg bg-card">
              <img src={`/nfts/${post.artwork}-320.webp`} width={268} height={195} alt="" loading="lazy" className="h-[195px] w-full object-cover" />
              <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
                <p className="text-xs leading-4 font-medium text-text-secondary">
                  {post.date} &nbsp;|&nbsp; Leitura de {post.read}
                </p>
                <h3 className="text-base leading-[21px] font-bold">{post.title}</h3>
                <p className="flex-1 text-xs leading-4 font-medium text-text-secondary">{post.text}</p>
                <button
                  type="button"
                  onClick={() => notifyUnavailable('O conteúdo editorial')}
                  className="w-fit text-xs leading-4 font-bold text-text-accent"
                  aria-label={`Ler mais: ${post.title}`}
                >
                  Ler mais →
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
