import React from "react"
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  accent?: 'primary' | 'warning' | 'destructive' | 'muted'
}

const accentMap = {
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
}

export function StatCard({ label, value, icon, accent = 'primary' }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-4 border border-border">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', accentMap[accent])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
