/**
 * PUBLIC PARTIDAS PAGE (/t/[token]/partidas)
 *
 * Read-only view of matches for the shared account, filtered by semester. No login required.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { MatchesList } from '@/components/matches-list'
import { notFound } from 'next/navigation'
import { resolveSemester, isDateInSemester } from '@/lib/semester'

export const dynamic = 'force-dynamic'

export default async function PublicPartidasPage({
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

  const [
    { data: matchesData },
    { data: opponents },
    { data: players },
    { data: matchEvents },
    { data: matchPlayers },
  ] = await Promise.all([
    admin.from('matches').select('*, opponent_teams(name)').eq('user_id', ownerId).order('match_date', { ascending: false }),
    admin.from('opponent_teams').select('id, name').eq('user_id', ownerId).order('name'),
    admin.from('players').select('id, name').eq('user_id', ownerId).order('name'),
    admin.from('match_events').select('id, event_type, player_id, match_id, assistant_id, players!match_events_player_id_fkey(name)').eq('user_id', ownerId),
    admin.from('match_players').select('*').eq('user_id', ownerId),
  ])

  const allMatches = matchesData || []
  const matchDates = allMatches.map(m => m.match_date).filter(Boolean)
  const semester = resolveSemester(semesterParam ?? null, matchDates)
  const matches = allMatches.filter(m => isDateInSemester(m.match_date, semester))

  const eventsByMatch = new Map<string, typeof matchEvents>()
  for (const e of matchEvents || []) {
    const list = eventsByMatch.get(e.match_id) || []
    list.push(e)
    eventsByMatch.set(e.match_id, list)
  }
  const playersByMatch = new Map<string, typeof matchPlayers>()
  for (const p of matchPlayers || []) {
    const list = playersByMatch.get(p.match_id) || []
    list.push(p)
    playersByMatch.set(p.match_id, list)
  }
  const matchesWithRelations = matches.map((m) => ({
    ...m,
    match_events: eventsByMatch.get(m.id) || [],
    match_players: playersByMatch.get(m.id) || [],
  }))

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <div className="mb-3 flex items-center justify-end">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          Somente leitura
        </span>
      </div>
      <MatchesList
        matches={matchesWithRelations}
        opponents={opponents || []}
        players={players || []}
        ownerId={ownerId}
        readOnly
      />
    </div>
  )
}
