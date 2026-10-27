import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRightIcon } from '@/shared/components/icons'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

/** Editorial hero slides (static design content), each pointing to a featured NFT. */
const SLIDES = [
  { nftId: 'emerald-ape-042', artwork: 'emerald', alt: 'Emerald Ape #042: macaco com óculos redondos verdes e jaqueta college verde' },
  { nftId: 'golden-beat-207', artwork: 'golden', alt: 'Golden Beat #207: macaco dourado com fones de ouvido verdes' },
  { nftId: 'ivory-baron-088', artwork: 'baron', alt: 'Ivory Baron #088: macaco de pelo preto com blazer creme' },
] as const

const srcSet = (artwork: string) => [320, 640, 960].map((w) => `/nfts/${artwork}-${w}.webp ${w}w`).join(', ')

function Dots({ active, onSelect, className }: { active: number; onSelect: (index: number) => void; className?: string }) {
  return (
    <div className={cn('flex gap-2', className)}>
      {SLIDES.map((slide, index) => (
        <button
          key={slide.nftId}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Mostrar destaque ${index + 1} de ${SLIDES.length}`}
          aria-current={index === active ? 'true' : undefined}
          className="grid size-6 place-items-center rounded-full"
        >
          <span aria-hidden="true" className={cn('size-2 rounded-full bg-primary transition-opacity motion-reduce:transition-none', index !== active && 'opacity-40')} />
        </button>
      ))}
    </div>
  )
}

export function HomeHero() {
  const [active, setActive] = useState(0)
  const slide = SLIDES[active]!

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="page-container">
      {/* Desktop hero (Figma "Hero": 600px copy column, 450px artwork). */}
      <div className="hidden min-h-[450px] items-center gap-[110px] pl-10 lg:flex">
        <div className="flex w-[600px] shrink-0 flex-col gap-11">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-4 font-medium tracking-[1.4px]">Bem-vindo à Kurio</p>
              <h1 className="text-[43px] leading-[70px] font-bold">
                SEJA DONO DO FUTURO
                <br />
                DA ARTE DIGITAL
              </h1>
              <p className="max-w-[557px] text-sm leading-6 text-text-secondary">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
              </p>
            </div>
            <Button asChild className="h-10 w-[140px] rounded-md text-base">
              <Link to="/" hash="mercado">
                EXPLORAR
              </Link>
            </Button>
          </div>
          <Dots active={active} onSelect={setActive} className="self-end" />
        </div>
        <Link
          to="/nfts/$nftId"
          params={{ nftId: slide.nftId }}
          aria-roledescription="slide"
          aria-label={`Destaque ${active + 1} de ${SLIDES.length}: ver ${slide.alt.split(':')[0]}`}
          className="block size-[450px] shrink-0 overflow-hidden rounded-[24px]"
        >
          <img
            src={`/nfts/${slide.artwork}-640.webp`}
            srcSet={srcSet(slide.artwork)}
            sizes="450px"
            width={450}
            height={450}
            alt={slide.alt}
            fetchPriority={active === 0 ? 'high' : 'auto'}
            className="size-full object-cover"
          />
        </Link>
      </div>

      {/* Mobile banner (Figma "Hero Banner"). */}
      <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-primary/20 to-primary/5 p-4 lg:hidden">
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 size-[248px] rounded-full bg-gradient-to-b from-[#dd9a5f6e] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-2 left-1/3 size-[248px] rounded-full bg-gradient-to-b from-[#dd9a5f5e] to-transparent" />
        <div className="relative flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm leading-4 font-medium">Bem-vindo à Kurio</p>
            <h1 className="text-lg leading-[29px] font-bold">
              SEJA DONO DA
              <br />
              CULTURA DIGITAL
            </h1>
            <p className="text-xs leading-[18px] text-text-secondary">Descubra NFTs selecionados de criadores do mundo todo.</p>
            <Link to="/" hash="mercado" className="flex items-center gap-1 text-sm font-bold text-text-accent">
              EXPLORAR <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          <Link to="/nfts/$nftId" params={{ nftId: slide.nftId }} className="relative w-[138px] shrink-0" aria-label={`Ver ${slide.alt.split(':')[0]}`}>
            <img
              src={`/nfts/${slide.artwork}-320.webp`}
              srcSet={srcSet(slide.artwork)}
              // Same candidates/sizes as the preload in index.html, so the preloaded file is reused.
              sizes="138px"
              width={138}
              height={138}
              alt=""
              fetchPriority={active === 0 ? 'high' : 'auto'}
              className="aspect-square w-full rounded-[14px] object-cover"
            />
            <img
              src="/nfts/nomad-160.webp"
              width={58}
              height={58}
              alt=""
              className="absolute -bottom-3 -left-3 size-[58px] rounded-[10px] border-2 border-surface-raised object-cover"
            />
          </Link>
        </div>
        <Dots active={active} onSelect={setActive} className="relative mt-2 justify-center" />
      </div>
    </section>
  )
}
