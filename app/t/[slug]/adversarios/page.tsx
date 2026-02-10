import { createClient } from '@/lib/supabase/server'
import { getTeamBySlug } from '@/lib/team'
import { notFound } from 'next/navigation'
import { OpponentsList } from '@/components/opponents-list'

export default async function PublicOpponentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const team = await getTeamBySlug(supabase, slug)
  if (!team) notFound()

  const { data: opponents } = await supabase
    .from('opponent_teams')
    .select('*, matches(goals_for, goals_against)')
    .eq('user_id', team.user_id)
    .order('name')

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <OpponentsList opponents={opponents || []} readOnly />
    </div>
  )
}
