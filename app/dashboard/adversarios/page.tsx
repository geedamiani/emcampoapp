import { createClient } from '@/lib/supabase/server'
import { OpponentsList } from '@/components/opponents-list'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'

export default async function OpponentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/auth/login')
  }
  const ownerId = await getEffectiveOwnerId(supabase, user.id)

  const { data: opponents } = await supabase
    .from('opponent_teams')
    .select('*, matches(goals_for, goals_against)')
    .eq('user_id', ownerId)
    .order('name')

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <OpponentsList opponents={opponents || []} ownerId={ownerId} />
    </div>
  )
}
