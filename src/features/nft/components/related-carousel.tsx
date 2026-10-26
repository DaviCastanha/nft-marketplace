import { Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { NftImage } from '@/shared/components/nft-image'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { NftSummary } from '@/shared/contracts/nft'
import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'

interface RelatedCarouselProps {
  title: string
  items: NftSummary[] | undefined
  isPending: boolean
}

const PAGE_DOTS = 3

/** Horizontal scroll-snap row with page dots ("Mais desta coleção", "Colecionadores também viram"). */
export function RelatedCarousel({ title, items, isPending }: RelatedCarouselProps) {
  const scroller = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const headingId = `related-${title.replace(/\W+/g, '-').toLowerCase()}`

  const scrollToPage = (index: number) => {
    const el = scroller.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    el.scrollTo({ left: (max * index) / (PAGE_DOTS - 1), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setPage(max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (PAGE_DOTS - 1)))
  }

  return (
    <section aria-labelledby={headingId} className="page-container flex flex-col gap-8">
      <h2 id={headingId} className="border-b-[0.5px] border-primary pb-3 text-[17px] leading-4 font-bold text-text-accent">
        {title}
      </h2>
      <ul ref={scroller} onScroll={onScroll} className="-mx-1 flex snap-x snap-mandatory gap-7 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
        {isPending || !items
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="w-[219px] shrink-0">
                <Skeleton className="h-[255px] w-full rounded-none" />
                <Skeleton className="mt-3 h-4 w-2/3" />
              </li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className="w-[219px] shrink-0 snap-start">
                <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="group flex flex-col gap-3 rounded-sm">
                  <span className="grid h-[255px] place-items-center bg-card p-2">
                    <NftImage image={nft.image} sizes="219px" alt="" className="w-full rounded-[12px]" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[15px] leading-5 group-hover:text-text-accent">{nft.name}</span>
                    <span className="text-base leading-4 font-bold text-text-accent">{formatEth(nft.price)}</span>
                  </span>
                </Link>
              </li>
            ))}
      </ul>
      <div className="flex justify-center gap-2">
        {Array.from({ length: PAGE_DOTS }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToPage(i)}
            aria-label={`Ir para o grupo ${i + 1} de ${PAGE_DOTS}`}
            aria-current={i === page ? 'true' : undefined}
            className="grid size-6 place-items-center rounded-full"
          >
            <span aria-hidden="true" className={cn('size-3 rounded-full border border-primary', i === page && 'bg-primary')} />
          </button>
        ))}
      </div>
    </section>
  )
}
