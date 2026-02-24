import { createClient } from '@/lib/supabase/server'
import { OpponentsList } from '@/components/opponents-list'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'
import { resolveSemester, isDateInSemester } from '@/lib/semester'

export default async function OpponentsPage({ searchParams }: { searchParams: Promise<{ semester?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/login')
  }
  const ownerId = await getEffectiveOwnerId(supabase, user.id)

  const [
    { data: opponents },
    { data: matches },
  ] = await Promise.all([
    supabase.from('opponent_teams').select('*, matches(goals_for, goals_against, match_date)').eq('user_id', ownerId).order('name'),
    supabase.from('matches').select('match_date').eq('user_id', ownerId),
  ])

  const matchDates = (matches || []).map(m => m.match_date).filter(Boolean)
  const semester = resolveSemester(params.semester ?? null, matchDates)

  const opponentsFiltered = (opponents || []).map(opp => ({
    ...opp,
    matches: (opp.matches || []).filter((m: { match_date?: string }) => m.match_date && isDateInSemester(m.match_date, semester)),
  }))

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <OpponentsList opponents={opponentsFiltered} ownerId={ownerId} />
    </div>
  )
}
