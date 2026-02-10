import React from "react"
import { BottomNav } from '@/components/bottom-nav'
import { DashboardHeader } from '@/components/dashboard-header'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateTeam } from '@/lib/team'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let teamSlug = ''
  if (user) {
    try {
      const team = await getOrCreateTeam(supabase, user.id, user.user_metadata?.team_name || 'Meu Time')
      teamSlug = team.slug
    } catch {
      // Team table might not exist yet - will be created after running migration
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <DashboardHeader teamSlug={teamSlug} />
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
