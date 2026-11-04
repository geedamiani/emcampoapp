'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  formatResultDate,
  formatWeekdayBadge,
  type NextMatchModel,
  type ResultLetter,
} from '@/lib/match-status'
import { toast } from 'sonner'

const resultColors: Record<ResultLetter, string> = {
  V: 'bg-primary text-primary-foreground',
  E: 'bg-muted text-muted-foreground',
  D: 'bg-destructive text-destructive-foreground',
}

function golsLabel(goalsFor: number, goalsAgainst: number) {
  const marcados = goalsFor === 1 ? '1 marcado' : `${goalsFor} marcados`
  const sofridos = goalsAgainst === 1 ? '1 sofrido' : `${goalsAgainst} sofridos`
  return `Gols: ${marcados}, ${sofridos}`
}

function StatBox({ value, label, valueClassName }: { value: number; label: string; valueClassName?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-secondary px-1 py-2">
      <span className={cn('text-lg font-bold tabular-nums leading-none', valueClassName)}>{value}</span>
      <span className="mt-1 text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={up ? 'M7 14l5-5 5 5H7z' : 'M7 10l5 5 5-5H7z'} />
    </svg>
  )
}

export function NextMatchCard({
  match,
  readOnly = false,
  semester,
}: {
  match: NextMatchModel
  readOnly?: boolean
  semester?: string
}) {
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const history = match.history
  const isNewOpponent = history.games === 0

  const registerScore = () => {
    const params = new URLSearchParams()
    if (semester) params.set('semester', semester)
    params.set('registrar', match.id)
    router.push(`/dashboard/partidas?${params.toString()}`)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('matches').delete().eq('id', match.id)
    setIsDeleting(false)
    if (error) {
      toast.error('Erro ao excluir partida')
      return
    }
    toast.success('Partida excluída')
    setDeleteOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className={cn(
        'rounded-xl border bg-card p-4',
        match.isOverdue ? 'border-[hsl(var(--warning))]/80' : 'border-primary/45',
      )}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Próxima partida</h3>
          <span className="shrink-0 rounded-full bg-[hsl(var(--warning))]/15 px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--warning))]">
            {formatWeekdayBadge(match.matchDate)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-foreground">vs {match.opponentName}</p>
          {isNewOpponent && (
            <span className="rounded-full bg-[hsl(var(--chart-4))]/15 px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--chart-4))]">
              Novo time
            </span>
          )}
        </div>

        {match.isOverdue && (
          <p className="mt-1 text-xs font-medium text-[hsl(var(--warning))]">Atrasada</p>
        )}

        {!isNewOpponent && (
          <>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <StatBox value={history.games} label={history.games === 1 ? 'Jogo' : 'Jogos'} />
              <StatBox value={history.wins} label="V" valueClassName="text-primary" />
              <StatBox value={history.draws} label="E" />
              <StatBox value={history.losses} label="D" valueClassName="text-destructive" />
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">{golsLabel(history.goalsFor, history.goalsAgainst)}</p>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary"
              aria-expanded={open}
              onClick={() => setOpen(current => !current)}
            >
              {open ? 'Ocultar jogos' : `Ver ${history.games} ${history.games === 1 ? 'jogo' : 'jogos'}`}
              <Chevron up={open} />
            </button>
            {open && (
              <div className="mt-2 flex flex-col gap-2">
                {history.results.map(result => (
                  <div key={result.id} className="flex items-center gap-3">
                    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold', resultColors[result.result])}>
                      {result.result}
                    </div>
                    <p className="flex-1 text-sm text-foreground">{formatResultDate(result.matchDate)}</p>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {result.goalsFor} - {result.goalsAgainst}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!readOnly && match.canRegisterScore && (
          <Button
            type="button"
            className="mt-3 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={registerScore}
          >
            Registrar placar
          </Button>
        )}
        {!readOnly && match.isOverdue && (
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-11 w-full border-border bg-transparent text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Excluir
          </Button>
        )}
      </div>

      {!readOnly && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="bg-card border-border max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Excluir partida?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita. A partida agendada será excluída.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
