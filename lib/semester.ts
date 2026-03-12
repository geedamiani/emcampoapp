/**
 * PERIOD UTILITIES
 *
 * Periods: a 4-digit year string ("2026") or "all" (no filter).
 * URL param: ?semester=2026 or ?semester=all
 * Default: current calendar year.
 */

export type Semester = string // "YYYY" | "all"

/** Check if a date string (YYYY-MM-DD) falls within the period. "all" matches everything. */
export function isDateInSemester(dateStr: string, period: Semester): boolean {
  if (period === 'all') return true
  return dateStr.startsWith(period + '-')
}

/** Get unique years from match dates, sorted most recent first */
export function getSemestersWithMatches(matchDates: string[]): Semester[] {
  const set = new Set<string>()
  for (const d of matchDates) {
    if (d) set.add(d.slice(0, 4))
  }
  return Array.from(set).sort((a, b) => Number(b) - Number(a))
}

/** Default period is always the current year */
export function getDefaultSemester(_matchDates: string[]): Semester {
  return String(new Date().getFullYear())
}

/** Resolve period from URL param. "all", current year, or a year with matches are valid. */
export function resolveSemester(param: string | null, matchDates: string[]): Semester {
  const currentYear = String(new Date().getFullYear())
  if (!param) return currentYear
  if (param === 'all') return 'all'
  const years = getSemestersWithMatches(matchDates)
  if (param === currentYear || years.includes(param)) return param
  return currentYear
}
