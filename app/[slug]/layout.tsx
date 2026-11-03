/**
 * PUBLIC SHARE LAYOUT (/<slug>)
 *
 * Read-only shell for a team slug: semester filter and bottom nav.
 */
import React, { Suspense } from 'react'
import { BottomNav } from '@/components/bottom-nav'
import { SemesterFilter } from '@/components/semester-filter'
import { getDefaultSemester, getSemestersWithMatches } from '@/lib/semester'
import { loadPublicMatchDates, requireShareBySlug } from '@/lib/public-team'

export const dynamic = 'force-dynamic'

export default async function PublicSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const share = await requireShareBySlug(slug)
  const matchDates = await loadPublicMatchDates(share.ownerId)
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
      <main className="flex-1 pb-nav">
        {children}
      </main>
      <BottomNav publicBaseHref={`/${share.slug}`} />
    </div>
  )
}
