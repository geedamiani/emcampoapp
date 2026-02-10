import React from "react"
import { createClient } from '@/lib/supabase/server'
import { getTeamBySlug } from '@/lib/team'
import { notFound } from 'next/navigation'
import { PublicHeader } from '@/components/public-header'
import { PublicBottomNav } from '@/components/public-bottom-nav'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const team = await getTeamBySlug(supabase, slug)

  if (!team) return { title: 'Time nao encontrado' }

  return {
    title: `${team.name} - Estatisticas`,
    description: `Acompanhe as estatisticas do ${team.name}`,
  }
}

export default async function PublicTeamLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const team = await getTeamBySlug(supabase, slug)

  if (!team) {
    notFound()
  }

  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader teamName={team.name} />
      <main className="flex-1 pb-20">
        {children}
      </main>
      <PublicBottomNav slug={slug} />
    </div>
  )
}
