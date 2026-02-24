/**
 * DASHBOARD LAYOUT
 *
 * Wraps all /dashboard/* pages. Resolves the effective owner (whose data we show),
 * fetches that owner's team name, builds the share link, and renders the header + bottom nav.
 * Fetches match dates for the semester filter (global time filter).
 */
import React, { Suspense } from "react"
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/bottom-nav'
import { DashboardHeader } from '@/components/dashboard-header'
import { WelcomeToast } from '@/components/welcome-toast'
import { SemesterFilter } from '@/components/semester-filter'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'
import { getOrCreateShareToken } from '@/lib/share'
import { getSemestersWithMatches, getDefaultSemester } from '@/lib/semester'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ownerId = user ? await getEffectiveOwnerId(supabase, user.id) : null

  let teamName: string | null = null
  let shareLink: string | null = null
  let availableSemesters: string[] = []
  let defaultSemester = ''

  if (ownerId) {
    // Try to fetch the owner's team name via admin client (needs SUPABASE_SERVICE_ROLE_KEY)
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()
      const { data: ownerUser } = await admin.auth.admin.getUserById(ownerId)
      teamName = (ownerUser?.user?.user_metadata?.team_name as string) || null
    } catch {
      // SUPABASE_SERVICE_ROLE_KEY not set — fall back to current user's metadata
      teamName = (user?.user_metadata?.team_name as string) || null
    }

    const token = await getOrCreateShareToken(ownerId)
    if (token) {
      const headersList = await headers()
      const host = headersList.get('host') || ''
      const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
      const origin = process.env.NEXT_PUBLIC_APP_URL || (host ? `${isLocalhost ? 'http' : 'https'}://${host}` : '')
      shareLink = origin ? `${origin}/t/${token}` : null
    }

    const { data: matches } = await supabase
      .from('matches')
      .select('match_date')
      .eq('user_id', ownerId)
    const matchDates = (matches || []).map(m => m.match_date).filter(Boolean)
    availableSemesters = getSemestersWithMatches(matchDates)
    defaultSemester = getDefaultSemester(matchDates)
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Suspense fallback={null}>
        <WelcomeToast />
      </Suspense>
      <DashboardHeader teamName={teamName} shareLink={shareLink} />
      {ownerId && (
        <div className="w-full border-b border-border bg-muted/30 px-4 py-2">
          <div className="mx-auto flex w-full max-w-lg items-center justify-end px-4">
            <Suspense fallback={null}>
              <SemesterFilter availableSemesters={availableSemesters} defaultSemester={defaultSemester || `${new Date().getFullYear()}-1`} />
            </Suspense>
          </div>
        </div>
      )}
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
