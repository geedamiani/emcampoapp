import React from "react"
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  accent?: 'primary' | 'warning' | 'destructive' | 'muted'
  /** Sits inside another card, so it drops the outer card chrome. */
  nested?: boolean
}

const accentMap = {
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
}

export function StatCard({ label, value, icon, accent = 'primary', nested = false }: StatCardProps) {
  return (
    <div className={cn(
      'flex min-w-0 items-center gap-3',
      nested
        ? 'rounded-lg bg-muted/50 px-3 py-2.5'
        : 'rounded-xl border border-border bg-card p-4',
    )}>
      {icon && (
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', accentMap[accent])}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className={cn('font-bold tabular-nums text-foreground', nested ? 'text-lg' : 'text-xl')}>{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
