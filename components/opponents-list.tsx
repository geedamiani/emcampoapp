/**
 * OPPONENTS LIST COMPONENT
 *
 * Renders the list of opponent teams on the Adversários page.
 * Each card shows: team name, record (wins/draws/losses).
 * Includes a search bar to filter opponents by name.
 */
'use client'

import React from "react"

import { useState, useMemo, useTransition, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { LoadingOverlay } from '@/components/loading-overlay'
import { cn } from '@/lib/utils'
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

interface MatchSummary {
  goals_for: number
  goals_against: number
}

interface OpponentTeam {
  id: string
  name: string
  matches: MatchSummary[]
}

function getRecord(matches: MatchSummary[]) {
  const w = matches.filter(m => m.goals_for > m.goals_against).length
  const d = matches.filter(m => m.goals_for === m.goals_against).length
  const l = matches.filter(m => m.goals_for < m.goals_against).length
  return { w, d, l, total: matches.length }
}

type SortKey = 'name' | 'total' | 'w' | 'd' | 'l'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={cn('ml-0.5 inline-block transition-opacity', active ? 'opacity-100' : 'opacity-30')}>
      {active && dir === 'asc'
        ? <path d="M12 19V5M5 12l7-7 7 7" />
        : <path d="M12 5v14M5 12l7 7 7-7" />}
    </svg>
  )
}

export function OpponentsList({ opponents, ownerId, readOnly = false }: { opponents: OpponentTeam[]; ownerId: string; readOnly?: boolean }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingOpponent, setEditingOpponent] = useState<OpponentTeam | null>(null)
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return key
      }
      setSortDir(key === 'name' ? 'asc' : 'desc')
      return key
    })
  }, [])

  const displayedOpponents = useMemo(() => {
    let list = opponents
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(o => o.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const ra = getRecord(a.matches)
      const rb = getRecord(b.matches)
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'total') cmp = ra.total - rb.total
      else if (sortKey === 'w') cmp = ra.w - rb.w
      else if (sortKey === 'd') cmp = ra.d - rb.d
      else if (sortKey === 'l') cmp = ra.l - rb.l
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [opponents, search, sortKey, sortDir])

  const refreshData = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  const handleAdd = () => {
    setEditingOpponent(null)
    setName('')
    setSheetOpen(true)
  }

  const handleEdit = (opponent: OpponentTeam) => {
    setEditingOpponent(opponent)
    setName(opponent.name)
    setSheetOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const supabase = createClient()

      if (editingOpponent) {
        const { error } = await withTimeout(supabase.from('opponent_teams').update({ name }).eq('id', editingOpponent.id))
        if (error) {
          toast.error(error.message || 'Erro ao atualizar time')
          return
        }
        toast.success('Time atualizado')
      } else {
        const { error } = await withTimeout(supabase.from('opponent_teams').insert({ name, user_id: ownerId }))
        if (error) {
          toast.error(error.message || 'Erro ao cadastrar time')
          return
        }
        toast.success('Time cadastrado')
      }

      refreshData()
      setSheetOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao salvar adversário'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const supabase = createClient()
    const { error } = await supabase.from('opponent_teams').delete().eq('id', deleteId)
    if (error) {
      toast.error('Erro ao excluir time. Verifique se não há partidas vinculadas.')
    } else {
      toast.success('Time excluído')
      refreshData()
    }
    setDeleteId(null)
  }

  return (
    <>
      {isPending && <LoadingOverlay />}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Adversários</h1>
          <p className="text-sm text-muted-foreground">{opponents.length} {opponents.length === 1 ? 'time cadastrado' : 'times cadastrados'}</p>
        </div>
        {!readOnly && (
        <Button onClick={handleAdd} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Adicionar
        </Button>
        )}
      </div>

      {/* Search bar */}
      {opponents.length > 0 && (
        <div className="relative mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar adversário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}

      {opponents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mb-3 text-muted-foreground/50">
            <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18" stroke="currentColor" strokeWidth="1.5" />
            <rect x="6" y="4" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="text-sm text-muted-foreground">Nenhum adversário cadastrado</p>
          <Button onClick={handleAdd} variant="ghost" size="sm" className="mt-2 text-primary hover:text-primary">
            Cadastrar primeiro adversário
          </Button>
        </div>
      ) : displayedOpponents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <p className="text-sm text-muted-foreground">Nenhum adversário encontrado</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  <button onClick={() => handleSort('name')} className="flex items-center hover:text-foreground transition-colors">
                    Adversário <SortIcon active={sortKey === 'name'} dir={sortDir} />
                  </button>
                </th>
                <th className="w-12 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                  <button onClick={() => handleSort('total')} className="inline-flex items-center hover:text-foreground transition-colors">
                    Jogos <SortIcon active={sortKey === 'total'} dir={sortDir} />
                  </button>
                </th>
                <th className="w-10 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                  <button onClick={() => handleSort('w')} className="inline-flex items-center hover:text-foreground transition-colors">
                    V <SortIcon active={sortKey === 'w'} dir={sortDir} />
                  </button>
                </th>
                <th className="w-10 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                  <button onClick={() => handleSort('d')} className="inline-flex items-center hover:text-foreground transition-colors">
                    E <SortIcon active={sortKey === 'd'} dir={sortDir} />
                  </button>
                </th>
                <th className="w-10 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                  <button onClick={() => handleSort('l')} className="inline-flex items-center hover:text-foreground transition-colors">
                    D <SortIcon active={sortKey === 'l'} dir={sortDir} />
                  </button>
                </th>
                {!readOnly && <th className="w-16" />}
              </tr>
            </thead>
            <tbody>
              {displayedOpponents.map((opponent) => {
                const record = getRecord(opponent.matches)
                return (
                  <tr key={opponent.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="truncate text-sm font-medium text-foreground">{opponent.name}</p>
                    </td>
                    <td className="px-2 py-2.5 text-center text-sm font-bold text-foreground">{record.total}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-bold text-primary">{record.w}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-bold text-muted-foreground">{record.d}</td>
                    <td className="px-2 py-2.5 text-center text-sm font-bold text-destructive">{record.l}</td>
                    {!readOnly && (
                      <td className="px-2 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(opponent)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(opponent.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!readOnly && (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-foreground">{editingOpponent ? 'Editar adversário' : 'Novo adversário'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="opp-name" className="text-muted-foreground">Nome do time</Label>
              <Input
                id="opp-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-secondary border-border"
                placeholder="Ex: Os Boleiros FC"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1 h-11 border-border text-muted-foreground bg-transparent" onClick={() => setSheetOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? 'Salvando...' : (editingOpponent ? 'Atualizar' : 'Cadastrar')}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      )}

      {!readOnly && (
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir adversário?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Todas as partidas contra esse time também serão excluídas.
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
      )}
    </>
  )
}
