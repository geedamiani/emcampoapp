/**
 * PUBLIC ADVERSÁRIOS PAGE (/<slug>/adversarios)
 */
import { OpponentsList } from '@/components/opponents-list'
import { loadPublicOpponents, requireShareBySlug, type PublicSearchParams } from '@/lib/public-team'

export const dynamic = 'force-dynamic'

export default async function PublicSlugAdversariosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<PublicSearchParams>
}) {
  const { slug } = await params
  const share = await requireShareBySlug(slug)
  const opponents = await loadPublicOpponents(share.ownerId, await searchParams)

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <div className="mb-3 flex items-center justify-end">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          Somente leitura
        </span>
      </div>
      <OpponentsList opponents={opponents} ownerId={share.ownerId} readOnly />
    </div>
  )
}
