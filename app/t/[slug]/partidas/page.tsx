import { createClient } from '@/lib/supabase/server'
import { getTeamBySlug } from '@/lib/team'
import { notFound } from 'next/navigation'
import { MatchesList } from '@/components/matches-list'

export default async function PublicMatchesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const team = await getTeamBySlug(supabase, slug)
  if (!team) notFound()

  const userId = team.user_id

  const [
    { data: matches },
  ] = await Promise.all([
    supabase
      .from('matches')
      .select('*, opponent_teams(name), match_events(id, event_type, player_id, players(name)), match_players(player_id, starter)')
      .eq('user_id', userId)
      .order('match_date', { ascending: false }),
  ])

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <MatchesList
        matches={matches || []}
        opponents={[]}
        players={[]}
        readOnly
      />
    </div>
  )
}
