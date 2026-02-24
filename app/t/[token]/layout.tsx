/**
 * PUBLIC SHARE LAYOUT
 *
 * Wraps all /t/[token]/* pages. Provides semester filter and bottom nav
 * so visitors can navigate between Início, Jogadores, Partidas, Adversários.
 */
import React, { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { BottomNav } from '@/components/bottom-nav'
import { SemesterFilter } from '@/components/semester-filter'
import { getSemestersWithMatches, getDefaultSemester } from '@/lib/semester'
import { notFound } from 'next/navigation'

export default async function PublicShareLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: shareRow, error: shareError } = await admin
    .from('team_share')
    .select('owner_id')
    .eq('token', token)
    .single()

  if (shareError || !shareRow) notFound()
  const ownerId = shareRow.owner_id

  const { data: matches } = await admin
    .from('matches')
    .select('match_date')
    .eq('user_id', ownerId)
  const matchDates = (matches || []).map(m => m.match_date).filter(Boolean)
  const availableSemesters = getSemestersWithMatches(matchDates)
  const defaultSemester = getDefaultSemester(matchDates)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="w-full border-b border-border bg-muted/30 px-4 py-2">
        <div className="mx-auto flex w-full max-w-lg items-center justify-end">
          <Suspense fallback={null}>
            <SemesterFilter availableSemesters={availableSemesters} defaultSemester={defaultSemester} />
          </Suspense>
        </div>
      </div>
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
