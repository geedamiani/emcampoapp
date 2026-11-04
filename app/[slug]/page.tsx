/**
 * PUBLIC SHARE PAGE (/<slug>)
 *
 * Read-only overview of a team's stats, filtered by semester.
 * The next scheduled match is shown above Últimas partidas, without actions.
 */
import { DashboardOverview } from '@/components/dashboard-overview'
import { loadPublicOverview, requireShareBySlug, type PublicSearchParams } from '@/lib/public-team'

export const dynamic = 'force-dynamic'

export default async function PublicSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<PublicSearchParams>
}) {
  const { slug } = await params
  const share = await requireShareBySlug(slug)
  const { stats, nextMatch } = await loadPublicOverview(share.ownerId, await searchParams)
  return <DashboardOverview stats={stats} nextMatch={nextMatch} readOnly />
}
