/**
 * PUBLIC SHARE PAGE (/t/[token])
 *
 * Read-only view of an account's stats. No login required.
 * Uses the admin client to bypass RLS (the token → owner_id lookup and all reads).
 * Uses players!match_events_player_id_fkey because match_events has two FKs to players.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { StatCard } from '@/components/stat-card'
import { RankingList } from '@/components/ranking-list'
import { RecentMatches } from '@/components/recent-matches'
import { BottomNav } from '@/components/bottom-nav'
import { notFound } from 'next/navigation'

export default async function PublicTeamPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
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
  ] = await Promise.all([
    admin.from('matches').select('*, opponent_teams(name)').eq('user_id', ownerId).order('match_date', { ascending: false }),
    admin.from('match_events').select('*, players!match_events_player_id_fkey(name)').eq('user_id', ownerId),
    admin.from('players').select('id, name').eq('user_id', ownerId),
  ])
  const playerNameById = Object.fromEntries((players || []).map(p => [p.id, p.name]))

  const totalMatches = matches?.length || 0
  const wins = matches?.filter((m) => m.goals_for > m.goals_against).length || 0
  const draws = matches?.filter((m) => m.goals_for === m.goals_against).length || 0
  const losses = matches?.filter((m) => m.goals_for < m.goals_against).length || 0
  const pointsEarned = wins * 3 + draws
  const pointsPossible = totalMatches * 3
  const aproveitamento = pointsPossible > 0 ? Math.round((pointsEarned / pointsPossible) * 100) : 0
  const golsMarcados = matches?.reduce((sum, m) => sum + (m.goals_for || 0), 0) || 0
  const golsContra = matches?.reduce((sum, m) => sum + (m.goals_against || 0), 0) || 0
  const saldoGols = golsMarcados - golsContra

  const goalsByPlayer: Record<string, { name: string; count: number }> = {}
  const assistsByPlayer: Record<string, { name: string; count: number }> = {}
  const yellowsByPlayer: Record<string, { name: string; count: number }> = {}
  const redsByPlayer: Record<string, { name: string; count: number }> = {}

  for (const ev of events || []) {
    const pName = ev.players?.name || 'Desconhecido'
    const key = ev.player_id
    if (ev.event_type === 'goal') {
      if (!goalsByPlayer[key]) goalsByPlayer[key] = { name: pName, count: 0 }
      goalsByPlayer[key].count++
      if (ev.assistant_id) {
        const aName = playerNameById[ev.assistant_id] || 'Desconhecido'
        if (!assistsByPlayer[ev.assistant_id]) assistsByPlayer[ev.assistant_id] = { name: aName, count: 0 }
        assistsByPlayer[ev.assistant_id].count++
      }
    } else if (ev.event_type === 'assist') {
      if (!assistsByPlayer[key]) assistsByPlayer[key] = { name: pName, count: 0 }
      assistsByPlayer[key].count++
    } else if (ev.event_type === 'yellow_card') {
      if (!yellowsByPlayer[key]) yellowsByPlayer[key] = { name: pName, count: 0 }
      yellowsByPlayer[key].count++
    } else if (ev.event_type === 'red_card') {
      if (!redsByPlayer[key]) redsByPlayer[key] = { name: pName, count: 0 }
      redsByPlayer[key].count++
    }
  }

  const toRanking = (map: Record<string, { name: string; count: number }>) =>
    Object.values(map)
      .sort((a, b) => b.count - a.count)
      .map((p) => ({ name: p.name, value: p.count }))

  const recentMatches = (matches || []).slice(0, 5).map((m) => ({
    id: m.id,
    opponent_name: m.opponent_teams?.name || 'Desconhecido',
    goals_for: m.goals_for,
    goals_against: m.goals_against,
    match_date: m.match_date,
  }))

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex-1 pb-20">
        <div className="mx-auto max-w-lg px-4 py-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Painel Geral</h1>
            <p className="text-sm text-muted-foreground">
              {teamName} &middot; {totalMatches} {totalMatches === 1 ? 'partida' : 'partidas'} &middot; {wins}V {draws}E {losses}D
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            Somente leitura
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatCard
            label="Aproveitamento"
            value={`${aproveitamento}%`}
            accent="primary"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
              </svg>
            }
          />
          <StatCard
            label="Saldo de gols"
            value={saldoGols >= 0 ? `+${saldoGols}` : `${saldoGols}`}
            accent={saldoGols >= 0 ? 'primary' : 'destructive'}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            label="Gols marcados"
            value={golsMarcados}
            accent="primary"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
              </svg>
            }
          />
          <StatCard
            label="Gols contra"
            value={golsContra}
            accent="destructive"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
              </svg>
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <RankingList title="Artilheiros" items={toRanking(goalsByPlayer)} accent="primary" emptyMessage="Sem gols" />
          <RankingList title="Assistências" items={toRanking(assistsByPlayer)} accent="primary" emptyMessage="Sem assistências" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <RankingList title="C. amarelos" items={toRanking(yellowsByPlayer)} accent="warning" emptyMessage="Sem cartões" />
          <RankingList title="C. vermelhos" items={toRanking(redsByPlayer)} accent="destructive" emptyMessage="Sem cartões" />
        </div>
        <RecentMatches matches={recentMatches} />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
