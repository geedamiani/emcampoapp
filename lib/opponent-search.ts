/**
 * Accent- and case-insensitive matching for opponent names.
 * "São Paulo" and "sao paulo" compare equal.
 */

export function collapseOpponentName(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeOpponentSearch(value: string): string {
  return collapseOpponentName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

export function filterOpponentsByName<T extends { name: string }>(opponents: T[], query: string): T[] {
  const needle = normalizeOpponentSearch(query)
  if (!needle) return opponents
  return opponents.filter((opponent) => normalizeOpponentSearch(opponent.name).includes(needle))
}

export function findExactOpponent<T extends { name: string }>(opponents: T[], query: string): T | undefined {
  const needle = normalizeOpponentSearch(query)
  if (!needle) return undefined
  return opponents.find((opponent) => normalizeOpponentSearch(opponent.name) === needle)
}
