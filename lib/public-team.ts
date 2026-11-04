/**
 * Public team pages.
 *
 * /<slug> is the canonical read-only view.
 * /t/<token> redirects here and keeps the query string.
 */
import { cache } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildDashboardStats } from '@/lib/dashboard-stats'
import { isDateInSemester, resolveSemester } from '@/lib/semester'
import { isSlugFormat } from '@/lib/slug'
import { buildNextMatch, isPlayedMatch, playedMatchDates, type NextMatchModel } from '@/lib/match-status'

export type PublicSearchParams = Record<string, string | string[] | undefined>

export type PublicSection = 'jogadores' | 'partidas' | 'adversarios'

export const getShareBySlug = cache(async (slug: string) => {
  if (!isSlugFormat(slug)) return null
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_share')
    .select('owner_id, slug')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data?.owner_id || !data.slug) return null
  return { ownerId: data.owner_id as string, slug: data.slug as string }
})

export async function requireShareBySlug(slug: string) {
  const share = await getShareBySlug(slug)
  if (!share) notFound()
  return share
}

export function toQueryString(searchParams: PublicSearchParams): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') params.append(key, value)
    else if (Array.isArray(value)) {
      for (const item of value) params.append(key, item)
    }
  }
  return params.toString()
}

export async function redirectLegacyToken(
  token: string,
  section: PublicSection | null,
  searchParams: PublicSearchParams,
): Promise<never> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_share')
    .select('slug')
    .eq('token', token)
    .maybeSingle()
  if (error || !data?.slug || !isSlugFormat(data.slug)) notFound()

  const path = section ? `/${data.slug}/${section}` : `/${data.slug}`
  const query = toQueryString(searchParams)
  permanentRedirect(query ? `${path}?${query}` : path)
}

function semesterFrom(searchParams: PublicSearchParams): string | null {
  const value = searchParams.semester
  return typeof value === 'string' ? value : null
}

function isStarter(row: { was_starter?: boolean | null; starter?: boolean | null }): boolean {
  return Boolean(row.was_starter ?? row.starter)
}

/**
 * Public overview for one owner, after the slug has already been resolved.
 *
 * The service role reads that owner's matches, including status = scheduled.
 * Anon still has no policy on public.matches. Only the single next fixture is
 * returned to the page. Scheduled rows are left out of the stats.
 */
export async function loadPublicOverview(
  ownerId: string,
  searchParams: PublicSearchParams,
): Promise<{ stats: ReturnType<typeof buildDashboardStats>; nextMatch: NextMatchModel | null }> {
  const admin = createAdminClient()
  const { data: ownerUser } = await admin.auth.admin.getUserById(ownerId)
  const teamName = (ownerUser?.user?.user_metadata?.team_name as string) || 'Meu Time'

  const [
    { data: matches },
    { data: events },
    { data: players },
    { data: matchPlayers },
  ] = await Promise.all([
    admin.from('matches').select('*, opponent_teams(name)').eq('user_id', ownerId).order('match_date', { ascending: false }),
    admin.from('match_events').select('*, players!match_events_player_id_fkey(name)').eq('user_id', ownerId),
    admin.from('players').select('id, name, position').eq('user_id', ownerId),
    admin.from('match_players').select('player_id, match_id').eq('user_id', ownerId),
  ])

  const allMatches = matches || []
  const playedMatches = allMatches.filter(isPlayedMatch)
  const matchDates = playedMatchDates(allMatches)
  const semester = resolveSemester(semesterFrom(searchParams), matchDates)
  const matchesInSemester = playedMatches.filter((match) => isDateInSemester(match.match_date, semester))
  const matchIdsInSemester = new Set(matchesInSemester.map((match) => match.id))

  return {
    stats: buildDashboardStats({
      teamName,
      matches: allMatches,
      events: events || [],
      players: players || [],
      matchPlayers: matchPlayers || [],
      matchIdsInSemester,
    }),
    nextMatch: buildNextMatch(allMatches),
  }
}

export async function loadPublicPlayers(ownerId: string, searchParams: PublicSearchParams) {
  const admin = createAdminClient()
  const [
    { data: players },
    { data: matchPlayers },
    { data: events },
    { data: matches },
  ] = await Promise.all([
    admin.from('players').select('id, name, position').eq('user_id', ownerId).order('name'),
    admin.from('match_players').select('*').eq('user_id', ownerId),
    admin.from('match_events').select('player_id, event_type, assistant_id, match_id').eq('user_id', ownerId),
    admin.from('matches').select('id, match_date, status').eq('user_id', ownerId).order('match_date', { ascending: false }),
  ])

  const playedMatches = (matches || []).filter(isPlayedMatch)
  const matchDates = playedMatchDates(playedMatches)
  const semester = resolveSemester(semesterFrom(searchParams), matchDates)
  const matchesInSemester = playedMatches.filter((match) => isDateInSemester(match.match_date, semester))
  const matchIdsInSemester = new Set(matchesInSemester.map((match) => match.id))
  const totalMatches = matchesInSemester.length

  return (players || []).map((player) => {
    const playerMatches = (matchPlayers || []).filter((row) => row.player_id === player.id && matchIdsInSemester.has(row.match_id))
    const playerEvents = (events || []).filter((event) => event.player_id === player.id && matchIdsInSemester.has(event.match_id))
    return {
      id: player.id,
      name: player.name,
      position: player.position,
      matches_played: playerMatches.length,
      matches_starter: playerMatches.filter((row) => isStarter(row)).length,
      total_matches: totalMatches,
      goals: playerEvents.filter((event) => event.event_type === 'goal').length,
      assists:
        (events || []).filter((event) => event.event_type === 'goal' && event.assistant_id === player.id && matchIdsInSemester.has(event.match_id)).length +
        playerEvents.filter((event) => event.event_type === 'assist').length,
    }
  })
}

export async function loadPublicMatches(ownerId: string, searchParams: PublicSearchParams) {
  const admin = createAdminClient()
  const [
    { data: matchesData },
    { data: opponents },
    { data: players },
    { data: matchEvents },
    { data: matchPlayers },
  ] = await Promise.all([
    admin.from('matches').select('*, opponent_teams(name)').eq('user_id', ownerId).order('match_date', { ascending: false }),
    admin.from('opponent_teams').select('id, name').eq('user_id', ownerId).order('name'),
    admin.from('players').select('id, name').eq('user_id', ownerId).order('name'),
    admin.from('match_events').select('id, event_type, player_id, match_id, assistant_id, players!match_events_player_id_fkey(name)').eq('user_id', ownerId),
    admin.from('match_players').select('*').eq('user_id', ownerId),
  ])

  const playedMatches = (matchesData || []).filter(isPlayedMatch)
  const matchDates = playedMatchDates(playedMatches)
  const semester = resolveSemester(semesterFrom(searchParams), matchDates)
  const matches = playedMatches.filter((match) => isDateInSemester(match.match_date, semester))

  const eventsByMatch = new Map<string, NonNullable<typeof matchEvents>>()
  for (const event of matchEvents || []) {
    const list = eventsByMatch.get(event.match_id) || []
    list.push(event)
    eventsByMatch.set(event.match_id, list)
  }
  const playersByMatch = new Map<string, NonNullable<typeof matchPlayers>>()
  for (const row of matchPlayers || []) {
    const list = playersByMatch.get(row.match_id) || []
    list.push(row)
    playersByMatch.set(row.match_id, list)
  }

  return {
    matches: matches.map((match) => ({
      ...match,
      match_events: eventsByMatch.get(match.id) || [],
      match_players: playersByMatch.get(match.id) || [],
    })),
    opponents: opponents || [],
    players: players || [],
  }
}

export async function loadPublicOpponents(ownerId: string, searchParams: PublicSearchParams) {
  const admin = createAdminClient()
  const [
    { data: opponents },
    { data: matches },
  ] = await Promise.all([
    admin.from('opponent_teams').select('*, matches(goals_for, goals_against, match_date, status)').eq('user_id', ownerId).order('name'),
    admin.from('matches').select('match_date, status').eq('user_id', ownerId),
  ])

  const matchDates = playedMatchDates(matches || [])
  const semester = resolveSemester(semesterFrom(searchParams), matchDates)

  return (opponents || []).map((opponent) => ({
    ...opponent,
    matches: (opponent.matches || []).filter((match: { match_date?: string; status?: string | null }) => (
      Boolean(match.match_date) && isPlayedMatch(match) && isDateInSemester(match.match_date as string, semester)
    )),
  }))
}

export async function loadPublicMatchDates(ownerId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data: matches } = await admin
    .from('matches')
    .select('match_date, status')
    .eq('user_id', ownerId)
  return playedMatchDates(matches || [])
}
