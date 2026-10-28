'use client'

import React from "react"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OpponentCombobox } from '@/components/opponent-combobox'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface OpponentTeam {
  id: string
  name: string
}

interface MatchFormProps {
  opponents: OpponentTeam[]
  match?: {
    id: string
    opponent_id: string
    match_date: string
    goals_for: number
    goals_against: number
  }
  ownerId: string
  onClose: () => void
  onOpponentsChange?: (opponents: OpponentTeam[]) => void
  onRefresh?: () => void
}

export function MatchForm({ opponents: initialOpponents, match, ownerId, onClose, onOpponentsChange, onRefresh }: MatchFormProps) {
  const [opponents, setOpponents] = useState(initialOpponents)
  const [opponentId, setOpponentId] = useState(match?.opponent_id || '')
  const [matchDate, setMatchDate] = useState(match?.match_date || '')
  const [goalsFor, setGoalsFor] = useState(match?.goals_for?.toString() || '0')
  const [goalsAgainst, setGoalsAgainst] = useState(match?.goals_against?.toString() || '0')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isEditing = !!match

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!opponentId || !matchDate.trim()) {
      toast.error('Selecione o adversário e a data')
      return
    }
    setIsLoading(true)

    try {
      const supabase = createClient()

      const payload = {
        opponent_id: opponentId,
        match_date: matchDate.trim(),
        goals_for: Number.parseInt(goalsFor, 10) || 0,
        goals_against: Number.parseInt(goalsAgainst, 10) || 0,
        user_id: ownerId,
      }

      if (isEditing) {
        const { error } = await withTimeout(supabase.from('matches').update(payload).eq('id', match.id))
        if (error) {
          toast.error(error.message || 'Erro ao atualizar partida')
          return
        }
        toast.success('Partida atualizada')
      } else {
        const { error } = await withTimeout(supabase.from('matches').insert(payload))
        if (error) {
          toast.error(error.message || 'Erro ao registrar partida')
          return
        }
        toast.success('Partida registrada')
      }

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
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="goals-for" className="text-muted-foreground">Gols a favor</Label>
          <Input
            id="goals-for"
            type="number"
            min="0"
            value={goalsFor}
            onChange={(e) => setGoalsFor(e.target.value)}
            className="h-11 bg-secondary border-border"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="goals-against" className="text-muted-foreground">Gols contra</Label>
          <Input
            id="goals-against"
            type="number"
            min="0"
            value={goalsAgainst}
            onChange={(e) => setGoalsAgainst(e.target.value)}
            className="h-11 bg-secondary border-border"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 h-11 border-border text-muted-foreground bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading || !opponentId}>
          {isLoading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Registrar')}
        </Button>
      </div>
    </form>
  )
}
