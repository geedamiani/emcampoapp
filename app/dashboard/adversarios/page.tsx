import { createClient } from '@/lib/supabase/server'
import { OpponentsList } from '@/components/opponents-list'

export default async function OpponentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/login')
  }

  const { data: opponents } = await supabase
    .from('opponent_teams')
    .select('*, matches(goals_for, goals_against)')
    .eq('user_id', user.id)
    .order('name')

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <OpponentsList opponents={opponents || []} />
    </div>
  )
}
