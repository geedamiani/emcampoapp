/**
 * Lineup search uses the same accent- and case-insensitive matching as opponents.
 * "São" and "sao" compare equal.
 */
import {
  collapseOpponentName,
  filterOpponentsByName,
  findExactOpponent,
  normalizeOpponentSearch,
} from '@/lib/opponent-search'

export interface LineupSearchPlayer {
  id: string
  name: string
  appearances?: number
}

export function sortPlayersByAppearances<T extends { name: string; appearances?: number }>(players: T[]): T[] {
  return [...players].sort((a, b) => {
    const byAppearances = (b.appearances ?? 0) - (a.appearances ?? 0)
    if (byAppearances !== 0) return byAppearances
    return a.name.localeCompare(b.name, 'pt-BR')
  })
}

/** Players still available for this lineup, filtered by the query. Empty query keeps appearance order. */
export function lineupPlayerResults<T extends LineupSearchPlayer>(
  players: T[],
  query: string,
  excludeIds: ReadonlySet<string>,
): T[] {
  const available = players.filter((player) => !excludeIds.has(player.id))
  const matched = normalizeOpponentSearch(query) ? filterOpponentsByName(available, query) : available
  return sortPlayersByAppearances(matched)
}

/**
 * Name to offer as a new player, or null when the query is empty or already
 * matches someone on the roster (including players already in this lineup).
 */
export function playerCreateName<T extends { name: string }>(players: T[], query: string): string | null {
  const typed = collapseOpponentName(query)
  if (!typed) return null
  if (findExactOpponent(players, typed)) return null
  return typed
}
