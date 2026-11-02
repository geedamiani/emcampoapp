import assert from 'node:assert/strict'
import { buildDashboardStats, isGoalkeeperPosition, type MatchPlayerRow, type MatchRow, type PlayerRow } from './dashboard-stats'

function match(id: string, goalsFor: number, goalsAgainst: number, date = '2026-03-01', opponent = 'Rival'): MatchRow {
  return {
    id,
    match_date: date,
    goals_for: goalsFor,
    goals_against: goalsAgainst,
    opponent_teams: { name: opponent },
  }
}

function statsFor(options: {
  players: PlayerRow[]
  matches: MatchRow[]
  matchPlayers?: MatchPlayerRow[]
  periodIds?: string[]
}) {
  const periodIds = options.periodIds ?? options.matches.map(item => item.id)
  return buildDashboardStats({
    teamName: 'Hípica 40+',
    matches: options.matches,
    events: [],
    players: options.players,
    matchPlayers: options.matchPlayers ?? [],
    matchIdsInSemester: new Set(periodIds),
  })
}

const players: PlayerRow[] = [
  { id: 'gk1', name: 'Diego', position: 'Goleiro' },
  { id: 'gk2', name: 'Vini', position: ' goleiro ' },
  { id: 'gk3', name: 'Caio', position: 'GOLEIRO' },
  { id: 'out', name: 'V19', position: 'Atacante' },
  { id: 'line', name: 'Goleiro Linha', position: 'Goleiro Linha' },
  { id: 'none', name: 'Sem Posição', position: null },
]

const matches = [
  match('m1', 2, 3, '2026-03-01'),
  match('m2', 1, 0, '2026-03-08'),
  match('m3', 4, 2, '2026-04-01'),
  match('m4', 0, 5, '2025-12-01', 'Fora do período'),
  match('m5', 1, 1, '2026-04-08'),
]

const appearances: MatchPlayerRow[] = [
  { match_id: 'm1', player_id: 'gk1' },
  { match_id: 'm1', player_id: 'gk1' },
  { match_id: 'm1', player_id: 'out' },
  { match_id: 'm2', player_id: 'gk1' },
  { match_id: 'm2', player_id: 'gk2' },
  { match_id: 'm3', player_id: 'gk1' },
  { match_id: 'm3', player_id: 'gk2' },
  { match_id: 'm3', player_id: 'gk3' },
  { match_id: 'm4', player_id: 'gk1' },
  { match_id: 'm4', player_id: 'gk2' },
  { match_id: 'm5', player_id: 'line' },
  { match_id: 'm5', player_id: 'none' },
]

assert.equal(isGoalkeeperPosition('Goleiro'), true)
assert.equal(isGoalkeeperPosition(' GOLEIRO '), true)
assert.equal(isGoalkeeperPosition('Goleiro Linha'), false)
assert.equal(isGoalkeeperPosition(null), false)

const period = statsFor({
  players,
  matches,
  matchPlayers: appearances,
  periodIds: ['m1', 'm2', 'm3', 'm5'],
})

assert.deepEqual(
  period.goalkeepersByMatches.map(item => [item.name, item.value, item.matches]),
  [
    ['Diego', 3, 3],
    ['Vini', 2, 2],
    ['Caio', 1, 1],
  ],
)

assert.deepEqual(
  period.goalkeepersByGoalsConceded.map(item => [item.name, item.value, item.matches, item.perMatch]),
  [
    ['Vini', 0.67, 2, 0.33],
    ['Caio', 0.67, 1, 0.67],
    ['Diego', 3.67, 3, 1.22],
  ],
)

assert.equal(period.goalkeepersByMatches.some(item => item.name === 'V19'), false)
assert.equal(period.goalkeepersByMatches.some(item => item.name === 'Goleiro Linha'), false)
assert.equal(period.goalkeepersByMatches.some(item => item.name === 'Sem Posição'), false)

const shared = statsFor({
  players: [
    { id: 'a', name: 'Ana', position: 'Goleiro' },
    { id: 'b', name: 'Bia', position: 'Goleiro' },
  ],
  matches: [match('s1', 1, 4)],
  matchPlayers: [
    { match_id: 's1', player_id: 'a' },
    { match_id: 's1', player_id: 'b' },
  ],
})
assert.equal(shared.goalkeepersByGoalsConceded[0].value, 2)
assert.equal(shared.goalkeepersByGoalsConceded[1].value, 2)
assert.equal(
  shared.goalkeepersByGoalsConceded.reduce((sum, item) => sum + item.value, 0),
  4,
)

const names = statsFor({
  players: [
    { id: 'b', name: 'Bruno', position: 'Goleiro' },
    { id: 'a', name: 'Ana', position: 'Goleiro' },
  ],
  matches: [match('t1', 1, 1), match('t2', 1, 1)],
  matchPlayers: [
    { match_id: 't1', player_id: 'a' },
    { match_id: 't1', player_id: 'b' },
    { match_id: 't2', player_id: 'a' },
    { match_id: 't2', player_id: 'b' },
  ],
})
assert.deepEqual(names.goalkeepersByMatches.map(item => item.name), ['Ana', 'Bruno'])
assert.deepEqual(names.goalkeepersByGoalsConceded.map(item => item.name), ['Ana', 'Bruno'])

const manyPlayers: PlayerRow[] = Array.from({ length: 12 }, (_, index) => ({
  id: `k${index}`,
  name: `Goleiro ${String(index).padStart(2, '0')}`,
  position: 'Goleiro',
}))
const manyMatches = manyPlayers.map((player, index) => match(`k${index}`, 1, index))
const manyAppearances = manyPlayers.map(player => ({ match_id: player.id, player_id: player.id }))
const capped = statsFor({ players: manyPlayers, matches: manyMatches, matchPlayers: manyAppearances })
assert.equal(capped.goalkeepersByMatches.length, 10)
assert.equal(capped.goalkeepersByGoalsConceded.length, 10)
assert.equal(capped.goalkeepersByMatches[0].value, 1)
assert.deepEqual(
  capped.goalkeepersByGoalsConceded.map(item => item.value),
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
)

const withGoal = buildDashboardStats({
  teamName: 'Hípica 40+',
  matches: [match('g1', 1, 0)],
  events: [{
    player_id: 'out',
    event_type: 'goal',
    assistant_id: 'gk1',
    match_id: 'g1',
    players: { name: 'V19' },
  }],
  players,
  matchPlayers: [{ match_id: 'g1', player_id: 'out' }],
  matchIdsInSemester: new Set(['g1']),
})
assert.equal(withGoal.topGoalScorers[0]?.name, 'V19')
assert.equal(withGoal.topGoalScorers[0]?.value, 1)
assert.equal(withGoal.topAssistProviders[0]?.name, 'Diego')
assert.equal(withGoal.goalkeepersByMatches.length, 0)

console.log('dashboard-stats tests passed')
