import { cn } from '@/lib/utils'

interface MatchResult {
  id: string
  opponent_name: string
  goals_for: number
  goals_against: number
  match_date: string
}

function getResult(gf: number, ga: number) {
  if (gf > ga) return { label: 'V', color: 'bg-primary text-primary-foreground' }
  if (gf < ga) return { label: 'D', color: 'bg-destructive text-destructive-foreground' }
  return { label: 'E', color: 'bg-muted text-muted-foreground' }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function RecentMatches({ matches }: { matches: MatchResult[] }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Últimas partidas</h3>
        <p className="text-sm text-muted-foreground">Nenhuma partida registrada</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Últimas partidas</h3>
      <div className="flex flex-col gap-2.5">
        {matches.slice(0, 5).map((match) => {
          const result = getResult(match.goals_for, match.goals_against)
          return (
            <div key={match.id} className="flex items-center gap-3">
              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold', result.color)}>
                {result.label}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  vs {match.opponent_name}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(match.match_date)}</p>
              </div>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {match.goals_for} - {match.goals_against}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
