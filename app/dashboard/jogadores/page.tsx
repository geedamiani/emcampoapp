/**
 * JOGADORES PAGE
 *
 * Shows all players with their stats (matches played, goals, assists, cards),
 * filtered by the selected semester.
 */
import { createClient } from '@/lib/supabase/server'
import { PlayersList } from '@/components/players-list'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'
import { resolveSemester, isDateInSemester } from '@/lib/semester'

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ action?: string; semester?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/login')
  }
  const ownerId = await getEffectiveOwnerId(supabase, user.id)

  const [
    { data: players },
    { data: matchPlayers },
    { data: events },
    { data: matches },
  ] = await Promise.all([
    supabase.from('players').select('*').eq('user_id', ownerId).order('name'),
    supabase.from('match_players').select('*').eq('user_id', ownerId),
    supabase.from('match_events').select('player_id, event_type, assistant_id, match_id').eq('user_id', ownerId),
    supabase.from('matches').select('id, match_date').eq('user_id', ownerId).order('match_date', { ascending: false }),
  ])

  const matchDates = (matches || []).map(m => m.match_date).filter(Boolean)
  const semester = resolveSemester(params.semester ?? null, matchDates)
  const matchesInSemester = (matches || []).filter(m => isDateInSemester(m.match_date, semester))
  const matchIdsInSemester = new Set(matchesInSemester.map(m => m.id))

  const totalMatches = matchesInSemester.length

  const playersWithStats = (players || []).map(p => {
    const playerMatches = (matchPlayers || []).filter(mp => mp.player_id === p.id && matchIdsInSemester.has(mp.match_id))
    const playerEvents = (events || []).filter(ev => ev.player_id === p.id && matchIdsInSemester.has(ev.match_id))

    return {
      id: p.id,
      name: p.name,
      position: p.position,
      whatsapp: p.whatsapp,
      matches_played: playerMatches.length,
      matches_starter: playerMatches.filter(mp => (mp as { was_starter?: boolean; starter?: boolean }).was_starter ?? (mp as { was_starter?: boolean; starter?: boolean }).starter).length,
      total_matches: totalMatches,
      goals: playerEvents.filter(ev => ev.event_type === 'goal').length,
      assists:
        (events || []).filter(ev => ev.event_type === 'goal' && ev.assistant_id === p.id && matchIdsInSemester.has(ev.match_id)).length +
        playerEvents.filter(ev => ev.event_type === 'assist').length,
      yellow_cards: playerEvents.filter(ev => ev.event_type === 'yellow_card').length,
      red_cards: playerEvents.filter(ev => ev.event_type === 'red_card').length,
    }
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <PlayersList players={playersWithStats} ownerId={ownerId} autoOpen={params.action === 'new'} />
    </div>
  )
}
