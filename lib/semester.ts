/**
 * SEMESTER UTILITIES
 *
 * Semesters: 1 = Jan-Jun, 2 = Jul-Dec.
 * Format: "2024-1" (Jan-Jun 2024), "2024-2" (Jul-Dec 2024).
 */

export type Semester = string

/** Parse date string (YYYY-MM-DD) and return semester "YYYY-1" or "YYYY-2" */
export function getSemesterFromDate(dateStr: string): Semester {
  const [y, m] = dateStr.split('-').map(Number)
  const half = m <= 6 ? 1 : 2
  return `${y}-${half}`
}

/** Return { start, end } as YYYY-MM-DD for the semester */
export function getSemesterDateRange(semester: Semester): { start: string; end: string } {
  const [y, half] = semester.split('-').map(Number)
  if (half === 1) {
    return { start: `${y}-01-01`, end: `${y}-06-30` }
  }
  return { start: `${y}-07-01`, end: `${y}-12-31` }
}

/** Check if a date string falls within the semester */
export function isDateInSemester(dateStr: string, semester: Semester): boolean {
  const { start, end } = getSemesterDateRange(semester)
  return dateStr >= start && dateStr <= end
}

/** Get unique semesters from match dates, sorted most recent first */
export function getSemestersWithMatches(matchDates: string[]): Semester[] {
  const set = new Set<Semester>()
  for (const d of matchDates) {
    if (d) set.add(getSemesterFromDate(d))
  }
  return Array.from(set).sort((a, b) => {
    const [ya, ha] = a.split('-').map(Number)
    const [yb, hb] = b.split('-').map(Number)
    if (ya !== yb) return yb - ya
    return hb - ha
  })
}

/** Get the latest semester that has at least 1 match. Fallback: current semester. */
export function getDefaultSemester(matchDates: string[]): Semester {
  const semesters = getSemestersWithMatches(matchDates)
  if (semesters.length > 0) return semesters[0]
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const half = m <= 6 ? 1 : 2
  return `${y}-${half}`
}

/** Format semester for display: "1º sem 2024" or "2º sem 2024" */
export function formatSemester(semester: Semester): string {
  const [y, half] = semester.split('-')
  return `${half}º sem ${y}`
}

/** Resolve effective semester from URL param and match dates. Returns param if valid, else default. */
export function resolveSemester(
  semesterParam: string | null,
  matchDates: string[]
): Semester {
  const defaultSem = getDefaultSemester(matchDates)
  if (!semesterParam) return defaultSem
  const valid = getSemestersWithMatches(matchDates)
  return (valid.length > 0 && valid.includes(semesterParam)) ? semesterParam : defaultSem
}
