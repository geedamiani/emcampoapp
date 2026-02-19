'use client'

import React from "react"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [showNewOpponent, setShowNewOpponent] = useState(false)
  const [newOpponentName, setNewOpponentName] = useState('')
  const [isCreatingOpponent, setIsCreatingOpponent] = useState(false)
  const router = useRouter()
  const isEditing = !!match

  const handleCreateOpponent = async () => {
    if (!newOpponentName.trim()) return
    setIsCreatingOpponent(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from('opponent_teams')
      .insert({ name: newOpponentName.trim(), user_id: ownerId })
      .select()
      .single()

    if (error || !data) {
      toast.error('Erro ao criar adversário')
    } else {
      const updated = [...opponents, data].sort((a, b) => a.name.localeCompare(b.name))
      setOpponents(updated)
      setOpponentId(data.id)
      setShowNewOpponent(false)
      setNewOpponentName('')
      onOpponentsChange?.(updated)
      toast.success('Adversário adicionado')
    }
    setIsCreatingOpponent(false)
  }

  const handleOpponentChange = (value: string) => {
    if (value === '__new__') {
      setShowNewOpponent(true)
      setOpponentId('')
    } else {
      setOpponentId(value)
      setShowNewOpponent(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!opponentId || !matchDate.trim()) {
      toast.error('Selecione o adversário e a data')
      return
    }
    setIsLoading(true)

    const supabase = createClient()

    const payload = {
      opponent_id: opponentId,
      match_date: matchDate.trim(),
      goals_for: Number.parseInt(goalsFor, 10) || 0,
      goals_against: Number.parseInt(goalsAgainst, 10) || 0,
      user_id: ownerId,
    }

    if (isEditing) {
      const { error } = await supabase.from('matches').update(payload).eq('id', match.id)
      setIsLoading(false)
      if (error) {
        toast.error(error.message || 'Erro ao atualizar partida')
        return
      }
      toast.success('Partida atualizada')
    } else {
      const { error } = await supabase.from('matches').insert(payload)
      setIsLoading(false)
      if (error) {
        toast.error(error.message || 'Erro ao registrar partida')
        return
      }
      toast.success('Partida registrada')
    }

    if (onRefresh) onRefresh()
    else router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label className="text-muted-foreground">Adversário</Label>
        {!showNewOpponent ? (
          <Select value={opponentId} onValueChange={handleOpponentChange} required>
            <SelectTrigger className="h-11 bg-secondary border-border">
              <SelectValue placeholder="Selecione o adversário" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {opponents.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
              <SelectItem value="__new__" className="text-primary font-medium">
                + Novo adversário
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="flex gap-2">
            <Input
              value={newOpponentName}
              onChange={(e) => setNewOpponentName(e.target.value)}
              placeholder="Nome do adversário"
              className="h-11 bg-secondary border-border flex-1"
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              className="h-11 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreateOpponent}
              disabled={isCreatingOpponent || !newOpponentName.trim()}
            >
              {isCreatingOpponent ? '...' : 'Criar'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-11 px-3 border-border text-muted-foreground bg-transparent"
              onClick={() => { setShowNewOpponent(false); setNewOpponentName('') }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </Button>
          </div>
        )}
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
