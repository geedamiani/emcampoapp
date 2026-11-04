import assert from 'node:assert/strict'
import {
  buildNextMatch,
  formatDayMonth,
  formatResultDate,
  formatSlashDate,
  formatWeekdayBadge,
  isPlayedMatch,
  matchHasLineupOrGoals,
  opponentHistory,
  pickNextScheduled,
  playedMatchDates,
  type NextMatchSource,
} from './match-status'

const TODAY = '2026-11-04'

function fixture(partial: Partial<NextMatchSource> & Pick<NextMatchSource, 'id' | 'match_date'>): NextMatchSource {
  return {
    goals_for: 0,
    goals_against: 0,
    status: 'played',
    opponent_id: 'op-1',
    opponent_teams: { name: 'Amigos de Terça' },
    ...partial,
  }
}

assert.equal(isPlayedMatch({ status: 'played' }), true)
assert.equal(isPlayedMatch({}), true)
assert.equal(isPlayedMatch({ status: null }), true)
assert.equal(isPlayedMatch({ status: 'scheduled' }), false)

assert.equal(formatWeekdayBadge('2026-11-11'), 'qua, 11 nov')
assert.equal(formatDayMonth('2026-11-11'), '11 de nov.')
assert.equal(formatResultDate('2026-03-04'), '04 mar 2026')
assert.equal(formatSlashDate('2026-11-11'), '11/11/2026')

const matches: NextMatchSource[] = [
  fixture({ id: 'played-old', match_date: '2025-11-12', goals_for: 2, goals_against: 4 }),
  fixture({ id: 'played-mar', match_date: '2026-03-04', goals_for: 0, goals_against: 0 }),
  fixture({ id: 'played-abr', match_date: '2026-04-15', goals_for: 1, goals_against: 0 }),
  fixture({ id: 'played-out', match_date: '2026-10-28', goals_for: 0, goals_against: 1 }),
  fixture({ id: 'other-opponent', match_date: '2026-08-01', goals_for: 5, goals_against: 0, opponent_id: 'op-2', opponent_teams: { name: 'Empório F.C.' } }),
  fixture({ id: 'scheduled-same', match_date: '2026-11-01', status: 'scheduled', goals_for: 9, goals_against: 9 }),
  fixture({ id: 'future-late', match_date: '2026-12-01', status: 'scheduled', opponent_teams: { name: 'Real Pinheiros' }, opponent_id: 'op-3' }),
  fixture({ id: 'future-soon', match_date: '2026-11-11', status: 'scheduled' }),
  fixture({ id: 'future-soon-b', match_date: '2026-11-11', status: 'scheduled' }),
]

const next = pickNextScheduled(matches, TODAY)
assert.equal(next?.id, 'future-soon')

const onlyOverdue = pickNextScheduled(
  [
    fixture({ id: 'late-b', match_date: '2026-10-02', status: 'scheduled' }),
    fixture({ id: 'late-a', match_date: '2026-09-01', status: 'scheduled' }),
  ],
  TODAY,
)
assert.equal(onlyOverdue?.id, 'late-a')

assert.equal(pickNextScheduled([fixture({ id: 'played-only', match_date: '2026-11-11' })], TODAY), null)

const history = opponentHistory(matches, 'op-1')
assert.equal(history.games, 4)
assert.equal(history.wins, 1)
assert.equal(history.draws, 1)
assert.equal(history.losses, 2)
assert.equal(history.goalsFor, 3)
assert.equal(history.goalsAgainst, 5)
assert.deepEqual(history.results.map(result => [result.id, result.result]), [
  ['played-out', 'D'],
  ['played-abr', 'V'],
  ['played-mar', 'E'],
  ['played-old', 'D'],
])

const card = buildNextMatch(matches, TODAY)
assert.equal(card?.opponentName, 'Amigos de Terça')
assert.equal(card?.matchDate, '2026-11-11')
assert.equal(card?.canRegisterScore, false)
assert.equal(card?.isOverdue, false)
assert.equal(card?.history.games, 4)

const overdueCard = buildNextMatch(
  [fixture({ id: 'late', match_date: '2026-11-01', status: 'scheduled', opponent_id: 'new' })],
  TODAY,
)
assert.equal(overdueCard?.canRegisterScore, true)
assert.equal(overdueCard?.isOverdue, true)
assert.equal(overdueCard?.history.games, 0)

const matchDay = buildNextMatch(
  [fixture({ id: 'today', match_date: TODAY, status: 'scheduled' })],
  TODAY,
)
assert.equal(matchDay?.canRegisterScore, true)
assert.equal(matchDay?.isOverdue, false)

assert.deepEqual(
  playedMatchDates([
    { match_date: '2027-01-02', status: 'scheduled' },
    { match_date: '2026-05-01', status: 'played' },
    { match_date: '2025-01-01' },
  ]),
  ['2026-05-01', '2025-01-01'],
)

assert.equal(matchHasLineupOrGoals({ goals_for: 0, goals_against: 0 }), false)
assert.equal(matchHasLineupOrGoals({ goals_for: 1, goals_against: 0 }), true)
assert.equal(matchHasLineupOrGoals({ goals_for: 0, goals_against: 2 }), true)
assert.equal(matchHasLineupOrGoals({ goals_for: 0, goals_against: 0, match_players: [{ player_id: 'p' }] }), true)
assert.equal(matchHasLineupOrGoals({
  goals_for: 0,
  goals_against: 0,
  match_events: [{ event_type: 'assist' }],
}), true)
assert.equal(matchHasLineupOrGoals({
  goals_for: 0,
  goals_against: 0,
  match_events: [{ event_type: 'yellow_card' }],
}), false)

console.log('match-status tests passed')
