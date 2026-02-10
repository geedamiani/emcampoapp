'use client'

export function PublicHeader({ teamName }: { teamName: string }) {
  const initials = teamName.slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            {initials}
          </div>
          <span className="text-sm font-semibold text-foreground">{teamName}</span>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          Somente visualizacao
        </span>
      </div>
    </header>
  )
}
