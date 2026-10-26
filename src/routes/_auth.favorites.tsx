import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { AccountLayout } from '@/features/account/components/account-layout'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { favoriteQueries } from '@/features/favorites/api'
import { Button } from '@/shared/components/ui/button'
import { useCurrentUser } from '@/shared/session/session-store'

export const Route = createFileRoute('/_auth/favorites')({
  head: () => ({ meta: [{ title: 'Lista de interesse — Kurio' }] }),
  component: FavoritesPage,
})

function FavoritesPage() {
  const user = useCurrentUser()!
  const favorites = useQuery(favoriteQueries.list(user.id))

  return (
    <AccountLayout active="favorites" title="Favoritos">
      <section aria-labelledby="favorites-title" className="flex flex-col gap-6">
        <h1 id="favorites-title" className="text-[17px] leading-4 font-bold">
          Lista de interesse
        </h1>
        {favorites.isPending ? (
          <div role="status" aria-label="Carregando favoritos" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-8">
            {Array.from({ length: 3 }, (_, i) => (
              <NftCardSkeleton key={i} />
            ))}
          </div>
        ) : favorites.error ? (
          <div role="alert" className="flex flex-col items-start gap-4">
            <p>{favorites.error.message}</p>
            <Button type="button" onClick={() => void favorites.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : favorites.data.items.length === 0 ? (
          <div className="flex flex-col items-start gap-4 bg-card p-8">
            <p className="font-bold">Você ainda não favoritou nenhum NFT.</p>
            <Button asChild variant="outline">
              <Link to="/" hash="mercado">
                Explorar o mercado
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:gap-x-8">
            {favorites.data.items.map((nft) => (
              <li key={nft.id}>
                <NftCard nft={nft} sizes="(min-width: 1024px) 258px, 50vw" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </AccountLayout>
  )
}
