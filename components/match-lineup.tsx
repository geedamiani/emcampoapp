/**
 * MATCH LINEUP COMPONENT
 *
 * Opened from the Partidas page when you click "Escalar jogadores".
 * Search adds a player immediately. New players are titulares until 11, then reservas.
 * Each goal still records a scorer and an optional assistant.
 * On save, calls the saveLineup server action (app/dashboard/partidas/actions.ts).
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { saveLineup } from '@/app/dashboard/partidas/actions'
import { PlayerCombobox, type LineupPlayerOption } from '@/components/player-combobox'
import { goalsAfterPlayerRemoved, isStarterByDefault, STARTER_LIMIT, type GoalDraft } from '@/lib/lineup'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Player {
  id: string
  name: string
  position?: string | null
  appearances?: number
}

interface ExistingMatchPlayer {
  player_id: string
  starter: boolean
}

interface ExistingEvent {
  id: string
  player_id: string
  event_type: string
  assistant_id?: string | null
}

interface PlayerLineup {
  playerId: string
  name: string
  starter: boolean
}

interface MatchLineupProps {
  matchId: string
  players: Player[]
  ownerId: string
  existingMatchPlayers: ExistingMatchPlayer[]
  existingEvents: ExistingEvent[]
  onClose: () => void
  onPlayersChange?: (players: LineupPlayerOption[]) => void
  onRefresh?: () => void
}

export function MatchLineup({
  matchId,
  players,
  ownerId,
  existingMatchPlayers,
  existingEvents,
  onClose,
  onPlayersChange,
  onRefresh,
}: MatchLineupProps) {
  const router = useRouter()
  const lineupRef = useRef<HTMLDivElement>(null)
  const previousCount = useRef(existingMatchPlayers.length)
  const [isSaving, setIsSaving] = useState(false)

  const withTimeout = async <T,>(promise: Promise<T>, ms = 15000): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão e tente novamente.')), ms)
    })
    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      clearTimeout(timeoutId!)
    }
  }

  const [lineup, setLineup] = useState<PlayerLineup[]>(() => {
    return existingMatchPlayers.map(mp => {
      const player = players.find(p => p.id === mp.player_id)
      return {
        playerId: mp.player_id,
        name: player?.name || 'Desconhecido',
        starter: mp.starter,
      }
    })
  })

  const [goalEntries, setGoalEntries] = useState<GoalDraft[]>(() => {
    return existingEvents
      .filter(e => e.event_type === 'goal')
      .map(e => ({
        id: e.id,
        scorerId: e.player_id,
        assistantId: e.assistant_id ?? null,
      }))
  })

  const starterCount = lineup.filter(l => l.starter).length

  useEffect(() => {
    if (lineup.length > previousCount.current) {
      lineupRef.current?.scrollTo({ top: lineupRef.current.scrollHeight })
    }
    previousCount.current = lineup.length
  }, [lineup.length])

  const addPlayer = (player: LineupPlayerOption) => {
    setLineup(prev => {
      if (prev.some(l => l.playerId === player.id)) return prev
      const starters = prev.filter(l => l.starter).length
      return [...prev, {
        playerId: player.id,
        name: player.name,
        starter: isStarterByDefault(starters),
      }]
    })
  }

  const removePlayer = (playerId: string) => {
    setLineup(prev => prev.filter(l => l.playerId !== playerId))
    setGoalEntries(prev => goalsAfterPlayerRemoved(prev, playerId))
  }

  const toggleStarter = (playerId: string, starter: boolean) => {
    setLineup(prev => prev.map(l => l.playerId === playerId ? { ...l, starter } : l))
  }

  const addGoal = () => {
    const firstId = lineup[0]?.playerId
    if (!firstId) return
    setGoalEntries(prev => [...prev, {
      id: crypto.randomUUID(),
      scorerId: firstId,
      assistantId: null,
    }])
  }

  const removeGoal = (id: string) => {
    setGoalEntries(prev => prev.filter(goal => goal.id !== id))
  }

  const updateGoal = (id: string, field: 'scorerId' | 'assistantId', value: string | null) => {
    setGoalEntries(prev => prev.map(goal => {
      if (goal.id !== id) return goal
      const next = { ...goal, [field]: value }
      if (next.assistantId && next.assistantId === next.scorerId) next.assistantId = null
      return next
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const lineupPayload = lineup.map(l => ({
        playerId: l.playerId,
        starter: l.starter,
      }))
      const goalPayload = goalEntries.map(g => ({
        scorerId: g.scorerId,
        assistantId: g.assistantId,
      }))
      const result = await withTimeout(saveLineup(matchId, ownerId, lineupPayload, goalPayload))
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(result.eventsCount ? `Escalação salva (${result.eventsCount} eventos)` : 'Escalação salva')
      onClose()
      if (onRefresh) onRefresh()
      else router.push('/dashboard/partidas')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao salvar escalação'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground tabular-nums">
          Titulares {starterCount}/{STARTER_LIMIT}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {lineup.length} {lineup.length === 1 ? 'escalado' : 'escalados'}
        </p>
      </div>

      <PlayerCombobox
        players={players}
        excludeIds={lineup.map(l => l.playerId)}
        ownerId={ownerId}
        onAdd={addPlayer}
        onPlayersChange={onPlayersChange}
        disabled={isSaving}
      />

      <div ref={lineupRef} className="flex flex-col gap-2 max-h-[40svh] overflow-y-auto -mx-1 px-1">
        {lineup.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-2 text-muted-foreground/40">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="text-sm text-muted-foreground">Nenhum jogador escalado</p>
            <p className="mt-1 text-xs text-muted-foreground">Busque pelo nome para adicionar</p>
          </div>
        )}

        {lineup.map((l) => (
          <div key={l.playerId} className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {l.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="min-w-0 flex-1 text-sm font-medium text-foreground truncate">{l.name}</span>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => removePlayer(l.playerId)}
                aria-label={`Remover ${l.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mt-2 flex rounded-md bg-secondary p-0.5" role="group" aria-label={`Titular ou reserva: ${l.name}`}>
              <button
                type="button"
                aria-pressed={l.starter}
                className={cn(
                  'min-h-9 flex-1 rounded px-2 text-xs font-medium transition-colors',
                  l.starter ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
                onClick={() => toggleStarter(l.playerId, true)}
              >
                Titular
              </button>
              <button
                type="button"
                aria-pressed={!l.starter}
                className={cn(
                  'min-h-9 flex-1 rounded px-2 text-xs font-medium transition-colors',
                  !l.starter ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
                onClick={() => toggleStarter(l.playerId, false)}
              >
                Reserva
              </button>
            </div>
          </div>
        ))}
      </div>

      {lineup.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-sm font-semibold text-foreground">Gols da partida</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 border-primary/40 text-primary"
              onClick={addGoal}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Adicionar gol
            </Button>
          </div>
          {goalEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">Nenhum gol registrado. Adicione quem fez o gol e, se houver, quem deu a assistência.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {goalEntries.map((g) => (
                <li key={g.id} className="flex items-center gap-2 flex-wrap">
                  <Select value={g.scorerId} onValueChange={(v) => updateGoal(g.id, 'scorerId', v)}>
                    <SelectTrigger className="h-9 flex-1 min-w-[100px] text-xs border-border" aria-label="Autor do gol">
                      <SelectValue placeholder="Autor do gol" />
                    </SelectTrigger>
                    <SelectContent>
                      {lineup.map(p => (
                        <SelectItem key={p.playerId} value={p.playerId} className="text-xs">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-xs shrink-0">assist.</span>
                  <Select
                    value={g.assistantId ?? 'none'}
                    onValueChange={(v) => updateGoal(g.id, 'assistantId', v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="h-9 flex-1 min-w-[90px] text-xs border-border" aria-label="Assistência">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs text-muted-foreground">
                        —
                      </SelectItem>
                      {lineup.map(p => (
                        <SelectItem key={p.playerId} value={p.playerId} className="text-xs" disabled={p.playerId === g.scorerId}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeGoal(g.id)}
                    aria-label="Remover gol"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1 h-11 border-border text-muted-foreground bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Salvando...' : 'Salvar escalação'}
        </Button>
      </div>
    </div>
  )
}
