'use client'

import React from "react"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { OpponentCombobox } from '@/components/opponent-combobox'
import { createClient } from '@/lib/supabase/client'
import { matchHasLineupOrGoals, opponentIdOf, todayISO } from '@/lib/match-status'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface OpponentTeam {
  id: string
  name: string
}

interface MatchFormMatch {
  id: string
  opponent_id?: string
  opponent_team_id?: string
  match_date: string
  goals_for: number
  goals_against: number
  status?: string | null
  match_players?: { player_id: string }[]
  match_events?: { event_type?: string | null }[]
}

interface MatchFormProps {
  opponents: OpponentTeam[]
  match?: MatchFormMatch
  /** score: opened from Registrar placar, switch starts off. */
  mode?: 'edit' | 'score'
  ownerId: string
  onClose: () => void
  onOpponentsChange?: (opponents: OpponentTeam[]) => void
  onRefresh?: () => void
  onSaved?: (result: {
    id: string
    status: 'scheduled' | 'played'
    goalsFor: number
    goalsAgainst: number
  }) => void
}

async function scheduledWouldHideHistory(matchId: string): Promise<boolean> {
  const supabase = createClient()
  const [lineup, events, row] = await Promise.all([
    supabase.from('match_players').select('id', { count: 'exact', head: true }).eq('match_id', matchId),
    supabase.from('match_events').select('id', { count: 'exact', head: true }).eq('match_id', matchId).in('event_type', ['goal', 'assist']),
    supabase.from('matches').select('goals_for, goals_against').eq('id', matchId).maybeSingle(),
  ])
  if (lineup.error || events.error || row.error) return true
  return (lineup.count ?? 0) > 0
    || (events.count ?? 0) > 0
    || (row.data?.goals_for ?? 0) > 0
    || (row.data?.goals_against ?? 0) > 0
}

export function MatchForm({
  opponents: initialOpponents,
  match,
  mode = 'edit',
  ownerId,
  onClose,
  onOpponentsChange,
  onRefresh,
  onSaved,
}: MatchFormProps) {
  const [opponents, setOpponents] = useState(initialOpponents)
  const [opponentId, setOpponentId] = useState(match ? opponentIdOf(match) : '')
  const [matchDate, setMatchDate] = useState(match?.match_date || '')
  const [goalsFor, setGoalsFor] = useState(match?.goals_for?.toString() || '0')
  const [goalsAgainst, setGoalsAgainst] = useState(match?.goals_against?.toString() || '0')
  const [isFuture, setIsFuture] = useState(mode !== 'score' && match?.status === 'scheduled')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isEditing = !!match
  const today = todayISO()
  const dateAlreadyPassed = Boolean(matchDate) && matchDate < today

  const withTimeout = async <T,>(promise: PromiseLike<T>, ms = 15000): Promise<T> => {
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

  const handleFutureChange = (checked: boolean) => {
    if (checked && match && matchHasLineupOrGoals(match)) {
      toast.error('Não dá para agendar uma partida que já tem escalação ou gols.')
      return
    }
    setIsFuture(checked)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!opponentId || !matchDate.trim()) {
      toast.error('Selecione o adversário e a data')
      return
    }
    setIsLoading(true)

    try {
      if (isEditing && isFuture && (matchHasLineupOrGoals(match) || await scheduledWouldHideHistory(match.id))) {
        toast.error('Não dá para agendar uma partida que já tem escalação ou gols.')
        return
      }

      const supabase = createClient()
      const goalsForValue = isFuture ? 0 : Number.parseInt(goalsFor, 10) || 0
      const goalsAgainstValue = isFuture ? 0 : Number.parseInt(goalsAgainst, 10) || 0
      const status = isFuture ? 'scheduled' : 'played'

      const payload = {
        opponent_id: opponentId,
        match_date: matchDate.trim(),
        goals_for: goalsForValue,
        goals_against: goalsAgainstValue,
        status,
        user_id: ownerId,
      }

      if (isEditing) {
        const { error } = await withTimeout(supabase.from('matches').update(payload).eq('id', match.id))
        if (error) {
          toast.error(error.message || 'Erro ao atualizar partida')
          return
        }
        toast.success(isFuture ? 'Partida agendada' : mode === 'score' ? 'Placar salvo' : 'Partida atualizada')
      } else {
        const { error } = await withTimeout(supabase.from('matches').insert(payload))
        if (error) {
          toast.error(error.message || 'Erro ao registrar partida')
          return
        }
        toast.success(isFuture ? 'Partida agendada' : 'Partida registrada')
      }

      onSaved?.({
        id: match?.id ?? '',
        status,
        goalsFor: goalsForValue,
        goalsAgainst: goalsAgainstValue,
      })
      if (onRefresh) onRefresh()
      else router.refresh()
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao salvar partida'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const submitLabel = isLoading
    ? 'Salvando...'
    : isFuture
      ? 'Agendar partida'
      : mode === 'score'
        ? 'Salvar placar'
        : isEditing
          ? 'Atualizar'
          : 'Registrar'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="match-opponent" className="text-muted-foreground">Adversário</Label>
        <OpponentCombobox
          id="match-opponent"
          opponents={opponents}
          value={opponentId}
          onValueChange={setOpponentId}
          onOpponentsChange={(updated) => {
            setOpponents(updated)
            onOpponentsChange?.(updated)
          }}
          ownerId={ownerId}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="match-date" className="text-muted-foreground">Data</Label>
        <Input
          id="match-date"
          type="date"
          required
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
          className="h-11 bg-secondary border-border"
        />
        {isFuture && dateAlreadyPassed && (
          <p className="text-xs text-[hsl(var(--warning))]">
            Essa data já passou. A partida fica atrasada até o placar ser registrado.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="goals-for" className={cn('text-muted-foreground', isFuture && 'opacity-60')}>Gols a favor</Label>
          <Input
            id="goals-for"
            type={isFuture ? 'text' : 'number'}
            min={isFuture ? undefined : '0'}
            inputMode={isFuture ? undefined : 'numeric'}
            disabled={isFuture}
            value={isFuture ? '-' : goalsFor}
            onChange={(e) => setGoalsFor(e.target.value)}
            className="h-11 bg-secondary border-border disabled:opacity-60"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="goals-against" className={cn('text-muted-foreground', isFuture && 'opacity-60')}>Gols contra</Label>
          <Input
            id="goals-against"
            type={isFuture ? 'text' : 'number'}
            min={isFuture ? undefined : '0'}
            inputMode={isFuture ? undefined : 'numeric'}
            disabled={isFuture}
            value={isFuture ? '-' : goalsAgainst}
            onChange={(e) => setGoalsAgainst(e.target.value)}
            className="h-11 bg-secondary border-border disabled:opacity-60"
          />
        </div>
      </div>
      <div className="flex h-11 items-center justify-between rounded-md border border-border bg-secondary px-3">
        <Label htmlFor="match-future" className="text-sm font-medium text-foreground">Partida futura</Label>
        <Switch
          id="match-future"
          checked={isFuture}
          onCheckedChange={handleFutureChange}
        />
      </div>
      {mode === 'score' && !isFuture && (
        <p className="text-xs text-muted-foreground">
          Depois de salvar, você escala quem jogou e lança gols e assistências, como sempre.
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 h-11 border-border text-muted-foreground bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading || !opponentId}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
