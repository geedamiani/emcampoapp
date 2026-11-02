/**
 * Dashboard stats computation — shared by authenticated and public overview pages.
 */

export type MatchRow = {
  id: string
  match_date: string
  goals_for: number
  goals_against: number
  opponent_teams: { name: string } | null
}

export type EventRow = {
  player_id: string
  event_type: string
  assistant_id?: string | null
  match_id: string
  players: { name: string } | null
}

export type PlayerRow = { id: string; name: string; position?: string | null }

export type MatchPlayerRow = {
  player_id: string
  match_id: string
}

export interface DashboardStats {
  teamName: string
  totalMatches: number
  wins: number
  draws: number
  losses: number
  aproveitamento: number
  golsMarcados: number
  golsContra: number
  saldoGols: number
  avgGolsFor: number
  avgGolsAgainst: number
  cleanSheets: number
  form: { result: 'V' | 'E' | 'D'; opponent: string; score: string; date: string }[]
  topGoalScorers: PlayerRateStat[]
  topAssistProviders: PlayerRateStat[]
  /** Keepers with the most matches. `value` is matches played. */
  goalkeepersByMatches: PlayerRateStat[]
  /**
   * Keepers with the fewest goals conceded.
   * `value` is goals conceded and `perMatch` is the average per match.
   */
  goalkeepersByGoalsConceded: PlayerRateStat[]
  recentMatches: {
    id: string
    opponent_name: string
    goals_for: number
    goals_against: number
    match_date: string
  }[]
}

export type PlayerRateStat = {
  id?: string
  name: string
  value: number
  matches: number
  perMatch: number
}

/** Players registered as "Goleiro", ignoring case and surrounding spaces. */
export function isGoalkeeperPosition(position: string | null | undefined): boolean {
  return (position ?? '').trim().toLowerCase() === 'goleiro'
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function toPlayerRateStats(
  map: Record<string, { name: string; count: number }>,
  appearances: Record<string, { matches: number }>,
): PlayerRateStat[] {
  return Object.entries(map)
    .map(([id, entry]) => {
      const matches = appearances[id]?.matches ?? 0
      return {
        id,
        name: entry.name,
        value: entry.count,
        matches,
        perMatch: matches > 0 ? round2(entry.count / matches) : entry.count,
      }
    })
    .sort((a, b) => b.value - a.value || b.perMatch - a.perMatch)
    .slice(0, 10)
}

function formatShortDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/**
 * Goalkeeper rankings for the selected period.
 *
 * A goalkeeper is a player whose position is "Goleiro". Matches are
 * match_players rows. Goals conceded are the opponent's goals
 * (matches.goals_against) in the matches that goalkeeper played.
 *
 * When more than one goalkeeper is lined up in the same match, those goals
 * are split evenly between them. The lineup does not store minutes or which
 * keeper was on the pitch for each goal, so an even split counts every
 * keeper who played without charging the same goal twice.
 *
 * "Partidas" ranks keepers by matches played, descending.
 * "Gols sofridos" ranks them by goals conceded, fewest first, and keeps the
 * average goals conceded per match. Each list is the top 10.
 */
function buildGoalkeeperRankings(
  players: PlayerRow[],
  matchesInSemester: MatchRow[],
  matchPlayersInSemester: MatchPlayerRow[],
): { byMatches: PlayerRateStat[]; byGoalsConceded: PlayerRateStat[] } {
  const goalkeepers = new Map(
    players.filter(player => isGoalkeeperPosition(player.position)).map(player => [player.id, player.name]),
  )
  if (goalkeepers.size === 0) return { byMatches: [], byGoalsConceded: [] }

  const goalsAgainstByMatch = new Map(matchesInSemester.map(match => [match.id, match.goals_against || 0]))
  const keepersByMatch = new Map<string, Set<string>>()

  for (const appearance of matchPlayersInSemester) {
    if (!goalkeepers.has(appearance.player_id)) continue
    if (!goalsAgainstByMatch.has(appearance.match_id)) continue
    const keepers = keepersByMatch.get(appearance.match_id) ?? new Set<string>()
    keepers.add(appearance.player_id)
    keepersByMatch.set(appearance.match_id, keepers)
  }

  const totals = new Map<string, { matches: number; goals: number }>()
  for (const [matchId, keeperIds] of keepersByMatch) {
    const share = (goalsAgainstByMatch.get(matchId) ?? 0) / keeperIds.size
    for (const keeperId of keeperIds) {
      const current = totals.get(keeperId) ?? { matches: 0, goals: 0 }
      current.matches += 1
      current.goals += share
      totals.set(keeperId, current)
    }
  }

  const stats = [...totals.entries()].map(([id, entry]) => ({
    id,
    name: goalkeepers.get(id) || 'Desconhecido',
    matches: entry.matches,
    goalsConceded: round2(entry.goals),
    perMatch: entry.matches > 0 ? round2(entry.goals / entry.matches) : 0,
  }))

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'pt-BR')

  const byMatches = [...stats]
    .sort((a, b) => b.matches - a.matches || a.goalsConceded - b.goalsConceded || byName(a, b))
    .slice(0, 10)
    .map(stat => ({
      id: stat.id,
      name: stat.name,
      value: stat.matches,
      matches: stat.matches,
      perMatch: stat.perMatch,
    }))

  const byGoalsConceded = [...stats]
    .sort((a, b) => a.goalsConceded - b.goalsConceded || a.perMatch - b.perMatch || byName(a, b))
    .slice(0, 10)
    .map(stat => ({
      id: stat.id,
      name: stat.name,
      value: stat.goalsConceded,
      matches: stat.matches,
      perMatch: stat.perMatch,
    }))

  return { byMatches, byGoalsConceded }
}

function getMatchResult(gf: number, ga: number): 'V' | 'E' | 'D' {
  if (gf > ga) return 'V'
  if (gf < ga) return 'D'
  return 'E'
}

export function buildDashboardStats(input: {
  teamName: string
  matches: MatchRow[]
  events: EventRow[]
  players: PlayerRow[]
  matchPlayers: MatchPlayerRow[]
  matchIdsInSemester: Set<string>
}): DashboardStats {
  const { teamName, matches, events, players, matchPlayers, matchIdsInSemester } = input

  const matchesInSemester = matches.filter(m => matchIdsInSemester.has(m.id))
  const eventsInSemester = events.filter(e => matchIdsInSemester.has(e.match_id))
  const matchPlayersInSemester = matchPlayers.filter(mp => matchIdsInSemester.has(mp.match_id))

  const playerNameById = Object.fromEntries(players.map(p => [p.id, p.name]))
  const totalMatches = matchesInSemester.length
  const wins = matchesInSemester.filter(m => m.goals_for > m.goals_against).length
  const draws = matchesInSemester.filter(m => m.goals_for === m.goals_against).length
  const losses = matchesInSemester.filter(m => m.goals_for < m.goals_against).length

  const pointsEarned = wins * 3 + draws
  const pointsPossible = totalMatches * 3
  const aproveitamento = pointsPossible > 0 ? Math.round((pointsEarned / pointsPossible) * 100) : 0

  const golsMarcados = matchesInSemester.reduce((sum, m) => sum + (m.goals_for || 0), 0)
  const golsContra = matchesInSemester.reduce((sum, m) => sum + (m.goals_against || 0), 0)
  const saldoGols = golsMarcados - golsContra
  const avgGolsFor = totalMatches > 0 ? Math.round((golsMarcados / totalMatches) * 10) / 10 : 0
  const avgGolsAgainst = totalMatches > 0 ? Math.round((golsContra / totalMatches) * 10) / 10 : 0
  const cleanSheets = matchesInSemester.filter(m => m.goals_against === 0).length

  const goalsByPlayer: Record<string, { name: string; count: number }> = {}
  const assistsByPlayer: Record<string, { name: string; count: number }> = {}

  for (const ev of eventsInSemester) {
    const pName = ev.players?.name || playerNameById[ev.player_id] || 'Desconhecido'
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
    }
  }

  const appearances: Record<string, { matches: number }> = {}
  for (const mp of matchPlayersInSemester) {
    if (!appearances[mp.player_id]) appearances[mp.player_id] = { matches: 0 }
    appearances[mp.player_id].matches++
  }

  const topGoalScorers = toPlayerRateStats(goalsByPlayer, appearances)
  const topAssistProviders = toPlayerRateStats(assistsByPlayer, appearances)
  const goalkeepers = buildGoalkeeperRankings(players, matchesInSemester, matchPlayersInSemester)

  const form = matchesInSemester.slice(0, 8).map(m => ({
    result: getMatchResult(m.goals_for, m.goals_against),
    opponent: m.opponent_teams?.name || 'Desconhecido',
    score: `${m.goals_for}-${m.goals_against}`,
    date: formatShortDate(m.match_date),
  }))

  const recentMatches = matchesInSemester.slice(0, 5).map(m => ({
    id: m.id,
    opponent_name: m.opponent_teams?.name || 'Desconhecido',
    goals_for: m.goals_for,
    goals_against: m.goals_against,
    match_date: m.match_date,
  }))

  return {
    teamName,
    totalMatches,
    wins,
    draws,
    losses,
    aproveitamento,
    golsMarcados,
    golsContra,
    saldoGols,
    avgGolsFor,
    avgGolsAgainst,
    cleanSheets,
    form,
    topGoalScorers,
    topAssistProviders,
    goalkeepersByMatches: goalkeepers.byMatches,
    goalkeepersByGoalsConceded: goalkeepers.byGoalsConceded,
    recentMatches,
  }
}
