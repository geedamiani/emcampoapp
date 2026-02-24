/**
 * PUBLIC JOGADORES PAGE (/t/[token]/jogadores)
 *
 * Read-only view of players for the shared account, filtered by semester. No login required.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { PlayersList } from '@/components/players-list'
import { notFound } from 'next/navigation'
import { resolveSemester, isDateInSemester } from '@/lib/semester'

export const dynamic = 'force-dynamic'

export default async function PublicJogadoresPage({
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
    { data: players },
    { data: matchPlayers },
    { data: events },
    { data: matches },
  ] = await Promise.all([
    admin.from('players').select('*').eq('user_id', ownerId).order('name'),
    admin.from('match_players').select('*').eq('user_id', ownerId),
    admin.from('match_events').select('player_id, event_type, assistant_id').eq('user_id', ownerId),
    admin.from('matches').select('id, match_date').eq('user_id', ownerId).order('match_date', { ascending: false }),
  ])

  const matchDates = (matches || []).map(m => m.match_date).filter(Boolean)
  const semester = resolveSemester(semesterParam ?? null, matchDates)
  const matchesInSemester = (matches || []).filter(m => isDateInSemester(m.match_date, semester))
  const matchIdsInSemester = new Set(matchesInSemester.map(m => m.id))

  const totalMatches = matchesInSemester.length
  const last5MatchIds = matchesInSemester.slice(0, 5).map(m => m.id)
  const last5PlayerIds = new Set(
    (matchPlayers || [])
      .filter(mp => last5MatchIds.includes(mp.match_id))
      .map(mp => mp.player_id)
  )
  const hasEnough = last5MatchIds.length >= 5

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
      inNegotiation: hasEnough && !last5PlayerIds.has(p.id),
    }
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <div className="mb-3 flex items-center justify-end">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          Somente leitura
        </span>
      </div>
      <PlayersList players={playersWithStats} ownerId={ownerId} readOnly />
    </div>
  )
}
