import React from "react"
import { BottomNav } from '@/components/bottom-nav'
import { DashboardHeader } from '@/components/dashboard-header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <DashboardHeader />
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
