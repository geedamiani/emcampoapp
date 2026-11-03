/**
 * LEGACY PARTIDAS PAGE (/t/<token>/partidas)
 */
import { redirectLegacyToken, type PublicSearchParams } from '@/lib/public-team'

export const dynamic = 'force-dynamic'

export default async function LegacyPartidasPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<PublicSearchParams>
}) {
  const { token } = await params
  await redirectLegacyToken(token, 'partidas', await searchParams)
}
