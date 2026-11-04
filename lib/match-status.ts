/**
 * Scheduled vs played matches.
 *
 * A scheduled match is a fixture waiting for a score. It stays out of stats,
 * rankings, period filters, and Últimas partidas. The next one is shown on
 * the internal panel and on the public team page.
 */

export type MatchStatus = 'scheduled' | 'played'

export type MatchStatusSource = {
  status?: string | null
}

export function isScheduledMatch(match: MatchStatusSource | null | undefined): boolean {
  return match?.status === 'scheduled'
}

/** Missing status counts as played so rows from before the migration still tally. */
export function isPlayedMatch(match: MatchStatusSource | null | undefined): boolean {
  return !isScheduledMatch(match)
}

const SAO_PAULO = 'America/Sao_Paulo'

/** Calendar day in São Paulo, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function isMatchDayOrPast(matchDate: string, today = todayISO()): boolean {
  return matchDate <= today
}

export function isOverdueMatch(matchDate: string, today = todayISO()): boolean {
  return matchDate < today
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const

function dateParts(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`)
  return {
    weekday: WEEKDAYS[date.getDay()] ?? 'dom',
    day: date.getDate(),
    month: MONTHS[date.getMonth()] ?? 'jan',
    year: date.getFullYear(),
  }
}

/** "qua, 11 nov" */
export function formatWeekdayBadge(dateStr: string): string {
  const { weekday, day, month } = dateParts(dateStr)
  return `${weekday}, ${day} ${month}`
}

/** "11 de nov." */
export function formatDayMonth(dateStr: string): string {
  const { day, month } = dateParts(dateStr)
  return `${day} de ${month}.`
}

/** "04 mar 2026" */
export function formatResultDate(dateStr: string): string {
  const { day, month, year } = dateParts(dateStr)
  return `${String(day).padStart(2, '0')} ${month} ${year}`
}

/** "11/11/2026" */
export function formatSlashDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return dateStr
  return `${day}/${month}/${year}`
}

export function opponentIdOf(match: {
  opponent_id?: string | null
  opponent_team_id?: string | null
}): string {
  return match.opponent_id || match.opponent_team_id || ''
}

export type DatedMatch = MatchStatusSource & {
  id: string
  match_date: string
}

function byDateThenId(a: DatedMatch, b: DatedMatch) {
  return a.match_date.localeCompare(b.match_date) || a.id.localeCompare(b.id)
}

/**
 * The fixture to feature: earliest date on or after today.
 * When every scheduled match is overdue, the oldest one.
 */
export function pickNextScheduled<T extends DatedMatch>(matches: T[], today = todayISO()): T | null {
  const scheduled = matches.filter(isScheduledMatch)
  if (scheduled.length === 0) return null
  const upcoming = scheduled.filter(match => match.match_date >= today).sort(byDateThenId)
  if (upcoming.length > 0) return upcoming[0]
  return [...scheduled].sort(byDateThenId)[0] ?? null
}

export type ResultLetter = 'V' | 'E' | 'D'

export function resultLetter(goalsFor: number, goalsAgainst: number): ResultLetter {
  if (goalsFor > goalsAgainst) return 'V'
  if (goalsFor < goalsAgainst) return 'D'
  return 'E'
}

export type HistoryMatch = DatedMatch & {
  goals_for: number
  goals_against: number
  opponent_id?: string | null
  opponent_team_id?: string | null
}

export type OpponentResult = {
  id: string
  matchDate: string
  goalsFor: number
  goalsAgainst: number
  result: ResultLetter
}

export type OpponentHistory = {
  games: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  results: OpponentResult[]
}

export function emptyOpponentHistory(): OpponentHistory {
  return {
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    results: [],
  }
}

/** All-time played matches against one opponent. Scheduled fixtures are ignored. */
export function opponentHistory(matches: HistoryMatch[], opponentId: string): OpponentHistory {
  if (!opponentId) return emptyOpponentHistory()

  const played = matches
    .filter(match => isPlayedMatch(match) && opponentIdOf(match) === opponentId)
    .sort((a, b) => b.match_date.localeCompare(a.match_date) || b.id.localeCompare(a.id))

  const history = emptyOpponentHistory()
  for (const match of played) {
    const result = resultLetter(match.goals_for || 0, match.goals_against || 0)
    history.games += 1
    history.goalsFor += match.goals_for || 0
    history.goalsAgainst += match.goals_against || 0
    if (result === 'V') history.wins += 1
    else if (result === 'E') history.draws += 1
    else history.losses += 1
    history.results.push({
      id: match.id,
      matchDate: match.match_date,
      goalsFor: match.goals_for || 0,
      goalsAgainst: match.goals_against || 0,
      result,
    })
  }
  return history
}

export type NextMatchSource = HistoryMatch & {
  opponent_teams?: { name: string } | null
}

export type NextMatchModel = {
  id: string
  opponentName: string
  matchDate: string
  canRegisterScore: boolean
  isOverdue: boolean
  history: OpponentHistory
}

export function buildNextMatch(matches: NextMatchSource[], today = todayISO()): NextMatchModel | null {
  const next = pickNextScheduled(matches, today)
  if (!next) return null
  return {
    id: next.id,
    opponentName: next.opponent_teams?.name || 'Desconhecido',
    matchDate: next.match_date,
    canRegisterScore: isMatchDayOrPast(next.match_date, today),
    isOverdue: isOverdueMatch(next.match_date, today),
    history: opponentHistory(matches, opponentIdOf(next)),
  }
}

export function playedMatchDates(
  matches: { match_date?: string | null; status?: string | null }[],
): string[] {
  return matches.flatMap(match => (isPlayedMatch(match) && match.match_date ? [match.match_date] : []))
}

/**
 * A played match that already has a lineup or a score cannot go back to
 * scheduled. That would hide goals and assists from the stats.
 * A 0-0 with nobody scaled can still be rescheduled.
 */
export function matchHasLineupOrGoals(match: {
  goals_for?: number | null
  goals_against?: number | null
  match_players?: unknown[] | null
  match_events?: { event_type?: string | null }[] | null
}): boolean {
  if ((match.goals_for ?? 0) > 0 || (match.goals_against ?? 0) > 0) return true
  if ((match.match_players?.length ?? 0) > 0) return true
  return (match.match_events ?? []).some(event => event.event_type === 'goal' || event.event_type === 'assist')
}
