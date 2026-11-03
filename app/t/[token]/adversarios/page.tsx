/**
 * LEGACY ADVERSÁRIOS PAGE (/t/<token>/adversarios)
 */
import { redirectLegacyToken, type PublicSearchParams } from '@/lib/public-team'

export const dynamic = 'force-dynamic'

export default async function LegacyAdversariosPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<PublicSearchParams>
}) {
  const { token } = await params
  await redirectLegacyToken(token, 'adversarios', await searchParams)
}
