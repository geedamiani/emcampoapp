import { createClient } from '@/lib/supabase/server'
import { MatchesList } from '@/components/matches-list'

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/login')
  }
  const userId = user.id

  const [
    { data: matches },
    { data: opponents },
    { data: players },
  ] = await Promise.all([
    supabase
      .from('matches')
      .select('*, opponent_teams(name), match_events(id, event_type, player_id, players(name)), match_players(player_id, starter)')
      .eq('user_id', userId)
      .order('match_date', { ascending: false }),
    supabase
      .from('opponent_teams')
      .select('id, name')
      .eq('user_id', userId)
      .order('name'),
    supabase
      .from('players')
      .select('id, name')
      .eq('user_id', userId)
      .order('name'),
  ])

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <MatchesList
        matches={matches || []}
        opponents={opponents || []}
        players={players || []}
        autoOpen={params.action === 'new'}
      />
    </div>
  )
}
