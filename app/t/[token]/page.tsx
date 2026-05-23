/**
 * PUBLIC SHARE PAGE (/t/[token])
 *
 * Read-only visual overview of an account's stats, filtered by semester.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardOverview } from '@/components/dashboard-overview'
import { notFound } from 'next/navigation'
import { resolveSemester, isDateInSemester } from '@/lib/semester'
import { buildDashboardStats } from '@/lib/dashboard-stats'

export default async function PublicTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ semester?: string }>
}) {
  const { token } = await params
  const { semester: semesterParam } = await searchParams
  const admin = createAdminClient()

  const { data: shareRow, error: shareError } = await admin
    .from('team_share')
    .select('owner_id')
    .eq('token', token)
    .single()

  if (shareError || !shareRow) notFound()
  const ownerId = shareRow.owner_id

  const { data: ownerUser } = await admin.auth.admin.getUserById(ownerId)
  const teamName = (ownerUser?.user?.user_metadata?.team_name as string) || 'Meu Time'

  const [
    { data: matches },
    { data: events },
    { data: players },
    { data: matchPlayers },
  ] = await Promise.all([
    admin.from('matches').select('*, opponent_teams(name)').eq('user_id', ownerId).order('match_date', { ascending: false }),
    admin.from('match_events').select('*, players!match_events_player_id_fkey(name)').eq('user_id', ownerId),
    admin.from('players').select('id, name').eq('user_id', ownerId),
    admin.from('match_players').select('*').eq('user_id', ownerId),
  ])

  const matchDates = (matches || []).map(m => m.match_date).filter(Boolean)
  const semester = resolveSemester(semesterParam ?? null, matchDates)
  const matchesInSemester = (matches || []).filter(m => isDateInSemester(m.match_date, semester))
  const matchIdsInSemester = new Set(matchesInSemester.map(m => m.id))

  const stats = buildDashboardStats({
    teamName,
    matches: matches || [],
    events: events || [],
    players: players || [],
    matchPlayers: matchPlayers || [],
    matchIdsInSemester,
  })

  return <DashboardOverview stats={stats} readOnly />
}
