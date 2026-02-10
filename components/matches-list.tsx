'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { MatchForm } from '@/components/match-form'
import { MatchLineup } from '@/components/match-lineup'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { LoadingOverlay } from '@/components/loading-overlay'
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

interface OpponentTeam {
  id: string
  name: string
}

interface Player {
  id: string
  name: string
}

interface MatchPlayer {
  player_id: string
  starter: boolean
}

interface MatchEvent {
  id: string
  event_type: string
  player_id: string
  players: { name: string } | null
}

interface Match {
  id: string
  opponent_id: string
  match_date: string
  goals_for: number
  goals_against: number
  opponent_teams: { name: string } | null
  match_events: MatchEvent[]
  match_players: MatchPlayer[]
}

function getResultInfo(gf: number, ga: number) {
  if (gf > ga) return { label: 'V', color: 'bg-primary text-primary-foreground' }
  if (gf < ga) return { label: 'D', color: 'bg-destructive text-destructive-foreground' }
  return { label: 'E', color: 'bg-muted text-muted-foreground' }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function groupEventsByPlayer(events: MatchEvent[], type: string) {
  const map: Record<string, { name: string; count: number }> = {}
  for (const e of events.filter(ev => ev.event_type === type)) {
    const name = e.players?.name || 'Desconhecido'
    if (!map[e.player_id]) map[e.player_id] = { name, count: 0 }
    map[e.player_id].count++
  }
  return Object.values(map)
}

function EventLine({ label, entries, color }: { label: string; entries: { name: string; count: number }[]; color: string }) {
  if (entries.length === 0) return null
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={cn('shrink-0 font-semibold mt-px', color)}>{label}:</span>
      <span className="text-foreground">
        {entries.map((e, i) => (
          <span key={e.name}>
            {i > 0 && ', '}
            <span className="font-medium">{e.name}</span>
            {e.count > 1 && <span className="text-muted-foreground"> ({e.count})</span>}
          </span>
        ))}
      </span>
    </div>
  )
}

export function MatchesList({
  matches,
  opponents,
  players,
  autoOpen = false,
  readOnly = false,
}: {
  matches: Match[]
  opponents: OpponentTeam[]
  players: Player[]
  autoOpen?: boolean
  readOnly?: boolean
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | undefined>(undefined)
  const [lineupSheetOpen, setLineupSheetOpen] = useState(false)
  const [lineupMatch, setLineupMatch] = useState<Match | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [currentOpponents, setCurrentOpponents] = useState(opponents)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (autoOpen && !readOnly) {
      setEditingMatch(undefined)
      setSheetOpen(true)
    }
  }, [autoOpen, readOnly])

  const refreshData = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const supabase = createClient()
    const { error } = await supabase.from('matches').delete().eq('id', deleteId)
    if (error) {
      toast.error('Erro ao excluir partida')
    } else {
      toast.success('Partida excluida')
      refreshData()
    }
    setDeleteId(null)
  }

  return (
    <>
      {isPending && <LoadingOverlay />}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Partidas</h1>
          <p className="text-sm text-muted-foreground">{matches.length} {matches.length === 1 ? 'partida registrada' : 'partidas registradas'}</p>
        </div>
        {!readOnly && (
          <Button onClick={() => { setEditingMatch(undefined); setSheetOpen(true) }} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nova partida
          </Button>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mb-3 text-muted-foreground/50">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="text-sm text-muted-foreground">Nenhuma partida registrada</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((match) => {
            const result = getResultInfo(match.goals_for, match.goals_against)
            const isExpanded = expandedId === match.id
            const playerCount = match.match_players?.length || 0

            const goals = groupEventsByPlayer(match.match_events, 'goal')
            const assists = groupEventsByPlayer(match.match_events, 'assist')
            const yellows = groupEventsByPlayer(match.match_events, 'yellow_card')
            const reds = groupEventsByPlayer(match.match_events, 'red_card')

            return (
              <div key={match.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  className="flex w-full items-center gap-3 p-3 text-left cursor-pointer active:bg-secondary/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : match.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : match.id)}
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold', result.color)}>
                    {result.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      vs {match.opponent_teams?.name || 'Desconhecido'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(match.match_date)}
                      {playerCount > 0 && ` \u00B7 ${playerCount} escalados`}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    {match.goals_for} - {match.goals_against}
                  </span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={cn('shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-180')}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-3 pb-3 pt-2">
                    {playerCount > 0 ? (
                      <div className="mb-3 flex flex-col gap-1.5">
                        <EventLine label="Gols" entries={goals} color="text-primary" />
                        <EventLine label="Assist." entries={assists} color="text-primary" />
                        <EventLine label="Amarelo" entries={yellows} color="text-warning" />
                        <EventLine label="Vermelho" entries={reds} color="text-destructive" />
                        {goals.length === 0 && assists.length === 0 && yellows.length === 0 && reds.length === 0 && (
                          <p className="text-xs text-muted-foreground">Nenhum evento registrado.</p>
                        )}
                      </div>
                    ) : (
                      <p className="mb-3 text-xs text-muted-foreground">Nenhum jogador escalado.</p>
                    )}

                    {!readOnly && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs border-border text-muted-foreground bg-transparent"
                          onClick={(e) => { e.stopPropagation(); setLineupMatch(match); setLineupSheetOpen(true) }}
                        >
                          {playerCount > 0 ? 'Editar escalacao' : 'Escalar jogadores'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); setEditingMatch(match); setSheetOpen(true) }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(match.id) }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && (
        <>
          {/* New/Edit Match Sheet */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl max-h-[85svh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-foreground">{editingMatch ? 'Editar partida' : 'Nova partida'}</SheetTitle>
              </SheetHeader>
              <MatchForm
                opponents={currentOpponents}
                match={editingMatch}
                onClose={() => setSheetOpen(false)}
                onOpponentsChange={setCurrentOpponents}
                onRefresh={refreshData}
              />
            </SheetContent>
          </Sheet>

          {/* Lineup Sheet */}
          <Sheet open={lineupSheetOpen} onOpenChange={setLineupSheetOpen}>
            <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl max-h-[90svh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-foreground">
                  Escalacao{lineupMatch?.opponent_teams?.name ? ` - vs ${lineupMatch.opponent_teams.name}` : ''}
                </SheetTitle>
              </SheetHeader>
              {lineupMatch && (
                <MatchLineup
                  matchId={lineupMatch.id}
                  players={players}
                  existingMatchPlayers={lineupMatch.match_players || []}
                  existingEvents={lineupMatch.match_events || []}
                  onClose={() => setLineupSheetOpen(false)}
                  onRefresh={refreshData}
                />
              )}
            </SheetContent>
          </Sheet>

          {/* Delete Match Dialog */}
          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent className="bg-card border-border max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Excluir partida?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa acao nao pode ser desfeita. Todos os jogadores escalados e eventos desta partida tambem serao excluidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  )
}
