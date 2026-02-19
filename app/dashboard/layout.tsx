/**
 * DASHBOARD LAYOUT
 *
 * Wraps all /dashboard/* pages. Resolves the effective owner (whose data we show),
 * fetches that owner's team name, builds the share link, and renders the header + bottom nav.
 */
import React, { Suspense } from "react"
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BottomNav } from '@/components/bottom-nav'
import { DashboardHeader } from '@/components/dashboard-header'
import { WelcomeToast } from '@/components/welcome-toast'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'
import { getOrCreateShareToken } from '@/lib/share'

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

  if (ownerId) {
    const admin = createAdminClient()
    const { data: ownerUser } = await admin.auth.admin.getUserById(ownerId)
    teamName = (ownerUser?.user?.user_metadata?.team_name as string) || null

    const token = await getOrCreateShareToken(ownerId)
    const headersList = await headers()
    const host = headersList.get('host') || ''
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
    const origin = process.env.NEXT_PUBLIC_APP_URL || (host ? `${isLocalhost ? 'http' : 'https'}://${host}` : '')
    shareLink = token && origin ? `${origin}/t/${token}` : null
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Suspense fallback={null}>
        <WelcomeToast />
      </Suspense>
      <DashboardHeader teamName={teamName} shareLink={shareLink} />
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
