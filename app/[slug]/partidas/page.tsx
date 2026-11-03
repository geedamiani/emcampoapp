/**
 * PUBLIC PARTIDAS PAGE (/<slug>/partidas)
 */
import { MatchesList } from '@/components/matches-list'
import { loadPublicMatches, requireShareBySlug, type PublicSearchParams } from '@/lib/public-team'

export const dynamic = 'force-dynamic'

export default async function PublicSlugPartidasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<PublicSearchParams>
}) {
  const { slug } = await params
  const share = await requireShareBySlug(slug)
  const data = await loadPublicMatches(share.ownerId, await searchParams)

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <div className="mb-3 flex items-center justify-end">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          Somente leitura
        </span>
      </div>
      <MatchesList
        matches={data.matches}
        opponents={data.opponents}
        players={data.players}
        ownerId={share.ownerId}
        readOnly
      />
    </div>
  )
}
