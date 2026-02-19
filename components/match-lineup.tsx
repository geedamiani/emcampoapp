/**
 * MATCH LINEUP COMPONENT
 *
 * Opened from the Partidas page when you click "Editar escalação".
 * Lets you: add/remove players, set starter/reserve, add goals (scorer + assistant), add cards.
 * On save, calls the saveLineup server action (app/dashboard/partidas/actions.ts).
 */
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { saveLineup } from '@/app/dashboard/partidas/actions'
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

/** One goal: scorer + optional assistant (linked for stats like "who assisted whom"). */
export interface GoalEntry {
  scorerId: string
  assistantId: string | null
}

interface PlayerLineup {
  playerId: string
  name: string
  starter: boolean
  yellowCards: number
  redCards: number
}

interface MatchLineupProps {
  matchId: string
  players: Player[]
  ownerId: string
  existingMatchPlayers: ExistingMatchPlayer[]
  existingEvents: ExistingEvent[]
  onClose: () => void
  onRefresh?: () => void
}

function Counter({ value, onChange, label, color = 'foreground', max = 20 }: { value: number; onChange: (v: number) => void; label: string; color?: string; max?: number }) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary',
    warning: 'text-warning',
    destructive: 'text-destructive',
    foreground: 'text-foreground',
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-muted-foreground active:bg-accent disabled:opacity-30"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
        </button>
        <span className={cn('w-5 text-center text-sm font-bold tabular-nums', colorMap[color])}>{value}</span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-muted-foreground active:bg-accent disabled:opacity-30"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
    </div>
  )
}

export function MatchLineup({ matchId, players, ownerId, existingMatchPlayers, existingEvents, onClose, onRefresh }: MatchLineupProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const buildInitialLineup = useCallback((): PlayerLineup[] => {
    return existingMatchPlayers.map(mp => {
      const player = players.find(p => p.id === mp.player_id)
      const playerEvents = existingEvents.filter(e => e.player_id === mp.player_id)
      return {
        playerId: mp.player_id,
        name: player?.name || 'Desconhecido',
        starter: mp.starter,
        yellowCards: playerEvents.filter(e => e.event_type === 'yellow_card').length,
        redCards: playerEvents.filter(e => e.event_type === 'red_card').length,
      }
    })
  }, [players, existingMatchPlayers, existingEvents])

  const buildInitialGoals = useCallback((): GoalEntry[] => {
    const goalEvents = existingEvents.filter(e => e.event_type === 'goal')
    return goalEvents.map(e => ({
      scorerId: e.player_id,
      assistantId: e.assistant_id ?? null,
    }))
  }, [existingEvents])

  const [lineup, setLineup] = useState<PlayerLineup[]>(buildInitialLineup)
  const [goalEntries, setGoalEntries] = useState<GoalEntry[]>(buildInitialGoals)

  const availablePlayers = players.filter(p => !lineup.some(l => l.playerId === p.id))

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === availablePlayers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(availablePlayers.map(p => p.id)))
    }
  }

  const addSelectedPlayers = () => {
    const newEntries: PlayerLineup[] = []
    for (const id of selectedIds) {
      const player = players.find(p => p.id === id)
      if (player) {
        newEntries.push({
          playerId: player.id,
          name: player.name,
          starter: true,
          yellowCards: 0,
          redCards: 0,
        })
      }
    }
    setLineup(prev => [...prev, ...newEntries])
    setSelectedIds(new Set())
    setShowPicker(false)
  }

  const removePlayer = (playerId: string) => {
    setLineup(prev => prev.filter(l => l.playerId !== playerId))
    setGoalEntries(prev => prev.filter(g => g.scorerId !== playerId && g.assistantId !== playerId))
  }

  const toggleStarter = (playerId: string) => {
    setLineup(prev => prev.map(l => l.playerId === playerId ? { ...l, starter: !l.starter } : l))
  }

  const updateStat = (playerId: string, field: 'yellowCards' | 'redCards', value: number) => {
    setLineup(prev => prev.map(l => l.playerId === playerId ? { ...l, [field]: value } : l))
  }

  const addGoal = () => {
    const firstId = lineup[0]?.playerId
    if (!firstId) return
    setGoalEntries(prev => [...prev, { scorerId: firstId, assistantId: null }])
  }

  const removeGoal = (index: number) => {
    setGoalEntries(prev => prev.filter((_, i) => i !== index))
  }

  const updateGoal = (index: number, field: 'scorerId' | 'assistantId', value: string | null) => {
    setGoalEntries(prev => prev.map((g, i) => i !== index ? g : { ...g, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const lineupPayload = lineup.map(l => ({
      playerId: l.playerId,
      starter: l.starter,
      yellowCards: l.yellowCards,
      redCards: l.redCards,
    }))
    const goalPayload = goalEntries.map(g => ({
      scorerId: g.scorerId,
      assistantId: g.assistantId,
    }))
    const result = await saveLineup(matchId, ownerId, lineupPayload, goalPayload)
    setIsSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(result.eventsCount ? `Escalação salva (${result.eventsCount} eventos)` : 'Escalação salva')
    onClose()
    router.push('/dashboard/partidas')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add players button */}
      {availablePlayers.length > 0 && !showPicker && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full border-dashed border-border text-muted-foreground bg-transparent"
          onClick={() => setShowPicker(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
          Adicionar jogadores ({availablePlayers.length} disponíveis)
        </Button>
      )}

      {/* Multi-select picker */}
      {showPicker && (
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Selecionar jogadores</span>
            <button
              type="button"
              className="text-xs text-primary font-medium"
              onClick={selectAll}
            >
              {selectedIds.size === availablePlayers.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          </div>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto -mx-1 px-1">
            {availablePlayers.map(p => {
              const isChecked = selectedIds.has(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                    isChecked ? 'bg-primary/10' : 'hover:bg-secondary'
                  )}
                  onClick={() => toggleSelection(p.id)}
                >
                  <div className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                    isChecked ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  )}>
                    {isChecked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-foreground">{p.name}</span>
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 border-border text-muted-foreground bg-transparent"
              onClick={() => { setShowPicker(false); setSelectedIds(new Set()) }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={addSelectedPlayers}
              disabled={selectedIds.size === 0}
            >
              Adicionar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Lineup count */}
      {lineup.length > 0 && (
        <p className="text-xs text-muted-foreground">{lineup.length} escalados</p>
      )}

      {/* Goals: scorer + optional assistant (linked for stats) */}
      {lineup.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Gols da partida</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-primary/40 text-primary"
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
              {goalEntries.map((g, idx) => (
                  <li key={idx} className="flex items-center gap-2 flex-wrap">
                    <Select value={g.scorerId} onValueChange={(v) => updateGoal(idx, 'scorerId', v)}>
                      <SelectTrigger className="h-9 flex-1 min-w-[100px] text-xs border-border">
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
                      onValueChange={(v) => updateGoal(idx, 'assistantId', v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="h-9 flex-1 min-w-[90px] text-xs border-border">
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
                      onClick={() => removeGoal(idx)}
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

      {/* Player cards (starter + cards only) */}
      <div className="flex flex-col gap-2 max-h-[45svh] overflow-y-auto -mx-1 px-1">
        {lineup.length === 0 && !showPicker && (
          <div className="flex flex-col items-center justify-center py-8">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mb-2 text-muted-foreground/40">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="text-sm text-muted-foreground">Nenhum jogador escalado</p>
          </div>
        )}

        {lineup.map((l) => (
          <div key={l.playerId} className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {l.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 text-sm font-medium text-foreground truncate">{l.name}</span>
              <button
                type="button"
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  l.starter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                )}
                onClick={() => toggleStarter(l.playerId)}
              >
                {l.starter ? 'Titular' : 'Reserva'}
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => removePlayer(l.playerId)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <Counter label="Cartão amarelo" value={l.yellowCards} onChange={(v) => updateStat(l.playerId, 'yellowCards', v)} color="warning" max={2} />
              <Counter label="Cartão vermelho" value={l.redCards} onChange={(v) => updateStat(l.playerId, 'redCards', v)} color="destructive" max={1} />
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
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
