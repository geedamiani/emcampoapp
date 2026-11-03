/**
 * LEGACY SHARE PAGE (/t/<token>)
 *
 * Permanent redirect to /<slug>, preserving the query string.
 */
import { redirectLegacyToken, type PublicSearchParams } from '@/lib/public-team'

export const dynamic = 'force-dynamic'

export default async function LegacyTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<PublicSearchParams>
}) {
  const { token } = await params
  await redirectLegacyToken(token, null, await searchParams)
}
