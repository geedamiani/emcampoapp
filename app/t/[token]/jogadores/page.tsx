/**
 * LEGACY JOGADORES PAGE (/t/<token>/jogadores)
 */
import { redirectLegacyToken, type PublicSearchParams } from '@/lib/public-team'

export const dynamic = 'force-dynamic'

export default async function LegacyJogadoresPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<PublicSearchParams>
}) {
  const { token } = await params
  await redirectLegacyToken(token, 'jogadores', await searchParams)
}
