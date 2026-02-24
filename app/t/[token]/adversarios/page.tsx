/**
 * PUBLIC ADVERSÁRIOS PAGE (/t/[token]/adversarios)
 *
 * Read-only view of opponent teams for the shared account, filtered by semester. No login required.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { OpponentsList } from '@/components/opponents-list'
import { notFound } from 'next/navigation'
import { resolveSemester, isDateInSemester } from '@/lib/semester'

export const dynamic = 'force-dynamic'

export default async function PublicAdversariosPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ semester?: string }>
}) {
  const { token } = await params
  const { semester: semesterParam } = await searchParams
  const admin = createAdminClient()

  const { data: shareRow, error: shareError } = await admin
    .from('team_share')
    .select('owner_id')
    .eq('token', token)
    .single()

  if (shareError || !shareRow) notFound()
  const ownerId = shareRow.owner_id

  const [
    { data: opponents },
    { data: matches },
  ] = await Promise.all([
    admin.from('opponent_teams').select('*, matches(goals_for, goals_against, match_date)').eq('user_id', ownerId).order('name'),
    admin.from('matches').select('match_date').eq('user_id', ownerId),
  ])

  const matchDates = (matches || []).map(m => m.match_date).filter(Boolean)
  const semester = resolveSemester(semesterParam ?? null, matchDates)

  const opponentsFiltered = (opponents || []).map(opp => ({
    ...opp,
    matches: (opp.matches || []).filter((m: { match_date?: string }) => m.match_date && isDateInSemester(m.match_date, semester)),
  }))

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <div className="mb-3 flex items-center justify-end">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          Somente leitura
        </span>
      </div>
      <OpponentsList opponents={opponentsFiltered} ownerId={ownerId} readOnly />
    </div>
  )
}
