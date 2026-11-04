/**
 * DASHBOARD (Painel Geral)
 *
 * Visual analytics overview for the current account, filtered by semester.
 */
import { createClient } from '@/lib/supabase/server'
import { DashboardOverview } from '@/components/dashboard-overview'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'
import { resolveSemester, isDateInSemester } from '@/lib/semester'
import { buildDashboardStats } from '@/lib/dashboard-stats'
import { buildNextMatch, isPlayedMatch, playedMatchDates } from '@/lib/match-status'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ semester?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/login')
  }
  const userId = await getEffectiveOwnerId(supabase, user.id)

  let dataClient = supabase
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    dataClient = createAdminClient()
  } catch {
    // fall back to user-scoped client
  }

  const [
    { data: matches },
    { data: events },
    { data: players },
    { data: matchPlayers },
  ] = await Promise.all([
    supabase.from('matches').select('*, opponent_teams(name)').eq('user_id', userId).order('match_date', { ascending: false }),
    dataClient.from('match_events').select('*, players!match_events_player_id_fkey(name)').eq('user_id', userId),
    supabase.from('players').select('id, name, position').eq('user_id', userId),
    dataClient.from('match_players').select('player_id, match_id').eq('user_id', userId),
  ])

  const allMatches = matches || []
  const playedMatches = allMatches.filter(isPlayedMatch)
  const matchDates = playedMatchDates(allMatches)
  const semester = resolveSemester(params.semester ?? null, matchDates)
  const matchesInSemester = playedMatches.filter(m => isDateInSemester(m.match_date, semester))
  const matchIdsInSemester = new Set(matchesInSemester.map(m => m.id))
  const nextMatch = buildNextMatch(allMatches)

  let teamName = (user?.user_metadata?.team_name as string) || 'Meu Time'
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { data: ownerUser } = await admin.auth.admin.getUserById(userId)
    teamName = (ownerUser?.user?.user_metadata?.team_name as string) || teamName
  } catch {
    // fall back to current user metadata
  }

  const stats = buildDashboardStats({
    teamName,
    matches: allMatches,
    events: events || [],
    players: players || [],
    matchPlayers: matchPlayers || [],
    matchIdsInSemester,
  })

  return <DashboardOverview stats={stats} nextMatch={nextMatch} semester={semester} />
}
