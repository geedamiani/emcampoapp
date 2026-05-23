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

export type PlayerRow = { id: string; name: string }

export type MatchPlayerRow = {
  player_id: string
  match_id: string
  was_starter?: boolean
  starter?: boolean
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
  totalYellows: number
  totalReds: number
  form: { result: 'V' | 'E' | 'D'; opponent: string; score: string; date: string }[]
  goalsTimeline: { label: string; date: string; golsFor: number; golsAgainst: number; opponent: string }[]
  topGoalScorers: PlayerRateStat[]
  topAssistProviders: PlayerRateStat[]
  topAppearances: { name: string; matches: number; starterRate: number }[]
  topYellows: { name: string; value: number }[]
  topReds: { name: string; value: number }[]
  topDuos: { name: string; value: number }[]
  recentMatches: {
    id: string
    opponent_name: string
    goals_for: number
    goals_against: number
    match_date: string
  }[]
}

export type PlayerRateStat = {
  name: string
  value: number
  matches: number
  perMatch: number
}

function toPlayerRateStats(
  map: Record<string, { name: string; count: number }>,
  appearances: Record<string, { matches: number }>,
): PlayerRateStat[] {
  return Object.entries(map)
    .map(([id, entry]) => {
      const matches = appearances[id]?.matches ?? 0
      return {
        name: entry.name,
        value: entry.count,
        matches,
        perMatch: matches > 0 ? Math.round((entry.count / matches) * 100) / 100 : entry.count,
      }
    })
    .sort((a, b) => b.value - a.value || b.perMatch - a.perMatch)
    .slice(0, 10)
}

function toRanking(map: Record<string, { name: string; count: number }>) {
  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .map(p => ({ name: p.name, value: p.count }))
}

function formatShortDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
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

  const matchesChronological = [...matchesInSemester].reverse()

  const goalsByPlayer: Record<string, { name: string; count: number }> = {}
  const assistsByPlayer: Record<string, { name: string; count: number }> = {}
  const yellowsByPlayer: Record<string, { name: string; count: number }> = {}
  const redsByPlayer: Record<string, { name: string; count: number }> = {}
  const duosByKey: Record<string, { name: string; count: number }> = {}

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

        const duoKey = `${ev.assistant_id}:${ev.player_id}`
        const duoName = `${aName} → ${pName}`
        if (!duosByKey[duoKey]) duosByKey[duoKey] = { name: duoName, count: 0 }
        duosByKey[duoKey].count++
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

  const appearances: Record<string, { name: string; matches: number; starters: number }> = {}
  for (const mp of matchPlayersInSemester) {
    const name = playerNameById[mp.player_id] || 'Desconhecido'
    if (!appearances[mp.player_id]) appearances[mp.player_id] = { name, matches: 0, starters: 0 }
    appearances[mp.player_id].matches++
    if (mp.was_starter ?? mp.starter) appearances[mp.player_id].starters++
  }

  const topGoalScorers = toPlayerRateStats(goalsByPlayer, appearances)
  const topAssistProviders = toPlayerRateStats(assistsByPlayer, appearances)
  const topYellows = toRanking(yellowsByPlayer)
  const topReds = toRanking(redsByPlayer)
  const topDuos = toRanking(duosByKey)

  const totalYellows = topYellows.reduce((s, p) => s + p.value, 0)
  const totalReds = topReds.reduce((s, p) => s + p.value, 0)

  const topAppearances = Object.values(appearances)
    .map(a => ({
      name: a.name,
      matches: a.matches,
      starterRate: a.matches > 0 ? Math.round((a.starters / a.matches) * 100) : 0,
    }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 5)

  const form = matchesInSemester.slice(0, 8).map(m => ({
    result: getMatchResult(m.goals_for, m.goals_against),
    opponent: m.opponent_teams?.name || 'Desconhecido',
    score: `${m.goals_for}-${m.goals_against}`,
    date: formatShortDate(m.match_date),
  }))

  const goalsTimeline = matchesChronological.map(m => ({
    label: m.opponent_teams?.name || 'Desconhecido',
    date: formatShortDate(m.match_date),
    golsFor: m.goals_for,
    golsAgainst: m.goals_against,
    opponent: m.opponent_teams?.name || 'Desconhecido',
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
    totalYellows,
    totalReds,
    form,
    goalsTimeline,
    topGoalScorers,
    topAssistProviders,
    topAppearances,
    topYellows,
    topReds,
    topDuos,
    recentMatches,
  }
}
