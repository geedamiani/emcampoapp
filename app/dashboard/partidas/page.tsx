/**
 * PARTIDAS PAGE
 *
 * Shows all matches for the current account.
 * Loads: matches, opponents, players, match events, and match players.
 * Passes everything to the MatchesList client component.
 *
 * NOTE: The join `players!match_events_player_id_fkey(name)` is needed
 * because match_events has TWO foreign keys to players (player_id and
 * assistant_id), so PostgREST needs to know which FK to use for the join.
 */
import { createClient } from '@/lib/supabase/server'
import { MatchesList } from '@/components/matches-list'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'

export const dynamic = 'force-dynamic'

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/login')
  }
  const ownerId = await getEffectiveOwnerId(supabase, user.id)

  // Try admin client for match_events (bypasses RLS), fall back to regular client
  let eventsClient = supabase
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    eventsClient = createAdminClient()
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY not set — use regular client
  }

  const [
    { data: matchesData },
    { data: opponents },
    { data: players },
    { data: matchEvents },
    { data: matchPlayers },
  ] = await Promise.all([
    supabase
      .from('matches')
      .select('*, opponent_teams(name)')
      .eq('user_id', ownerId)
      .order('match_date', { ascending: false }),
    supabase
      .from('opponent_teams')
      .select('id, name')
      .eq('user_id', ownerId)
      .order('name'),
    supabase
      .from('players')
      .select('id, name')
      .eq('user_id', ownerId)
      .order('name'),
    eventsClient
      .from('match_events')
      .select('id, event_type, player_id, match_id, assistant_id, players!match_events_player_id_fkey(name)')
      .eq('user_id', ownerId),
    supabase
      .from('match_players')
      .select('*')
      .eq('user_id', ownerId),
  ])

  const matches = matchesData || []

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
      <MatchesList
        matches={matchesWithRelations}
        opponents={opponents || []}
        players={players || []}
        ownerId={ownerId}
        autoOpen={params.action === 'new'}
      />
    </div>
  )
}
