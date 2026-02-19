/**
 * JOGADORES PAGE
 *
 * Shows all players with their stats (matches played, goals, assists, cards).
 * Assists count both legacy "assist" events AND goals where assistant_id = player.
 */
import { createClient } from '@/lib/supabase/server'
import { PlayersList } from '@/components/players-list'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
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
    supabase.from('match_events').select('player_id, event_type, assistant_id').eq('user_id', ownerId),
    supabase.from('matches').select('id, match_date').eq('user_id', ownerId).order('match_date', { ascending: false }),
  ])

  const totalMatches = matches?.length || 0

  // Get last 5 match IDs for "em negociacao" logic
  const last5MatchIds = (matches || []).slice(0, 5).map(m => m.id)
  const last5PlayerIds = new Set(
    (matchPlayers || [])
      .filter(mp => last5MatchIds.includes(mp.match_id))
      .map(mp => mp.player_id)
  )
  const hasEnough = last5MatchIds.length >= 5

  const playersWithStats = (players || []).map(p => {
    const playerMatches = (matchPlayers || []).filter(mp => mp.player_id === p.id)
    const playerEvents = (events || []).filter(ev => ev.player_id === p.id)

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
        (events || []).filter(ev => ev.event_type === 'goal' && ev.assistant_id === p.id).length +
        playerEvents.filter(ev => ev.event_type === 'assist').length,
      yellow_cards: playerEvents.filter(ev => ev.event_type === 'yellow_card').length,
      red_cards: playerEvents.filter(ev => ev.event_type === 'red_card').length,
      inNegotiation: hasEnough && !last5PlayerIds.has(p.id),
    }
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <PlayersList players={playersWithStats} ownerId={ownerId} autoOpen={params.action === 'new'} />
    </div>
  )
}
