'use client'

import React from "react"

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

interface MatchSummary {
  goals_for: number
  goals_against: number
}

interface OpponentTeam {
  id: string
  name: string
  matches: MatchSummary[]
}

export function OpponentsList({ opponents, readOnly = false }: { opponents: OpponentTeam[]; readOnly?: boolean }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingOpponent, setEditingOpponent] = useState<OpponentTeam | null>(null)
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (editingOpponent) {
      const { error } = await supabase.from('opponent_teams').update({ name }).eq('id', editingOpponent.id)
      if (error) {
        toast.error('Erro ao atualizar time')
      } else {
        toast.success('Time atualizado')
      }
    } else {
      const { error } = await supabase.from('opponent_teams').insert({ name, user_id: user!.id })
      if (error) {
        toast.error('Erro ao cadastrar time')
      } else {
        toast.success('Time cadastrado')
      }
    }

    setIsLoading(false)
    refreshData()
    setSheetOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const supabase = createClient()
    const { error } = await supabase.from('opponent_teams').delete().eq('id', deleteId)
    if (error) {
      toast.error('Erro ao excluir time. Verifique se nao ha partidas vinculadas.')
    } else {
      toast.success('Time excluido')
      refreshData()
    }
    setDeleteId(null)
  }

  function getRecord(matches: MatchSummary[]) {
    const w = matches.filter(m => m.goals_for > m.goals_against).length
    const d = matches.filter(m => m.goals_for === m.goals_against).length
    const l = matches.filter(m => m.goals_for < m.goals_against).length
    return { w, d, l, total: matches.length }
  }

  return (
    <>
      {isPending && <LoadingOverlay />}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Adversarios</h1>
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

      {opponents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mb-3 text-muted-foreground/50">
            <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18" stroke="currentColor" strokeWidth="1.5" />
            <rect x="6" y="4" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="text-sm text-muted-foreground">Nenhum adversario cadastrado</p>
          {!readOnly && (
            <Button onClick={handleAdd} variant="ghost" size="sm" className="mt-2 text-primary hover:text-primary">
              Cadastrar primeiro adversario
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {opponents.map((opponent) => {
            const record = getRecord(opponent.matches)
            return (
              <div key={opponent.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
                  {opponent.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{opponent.name}</p>
                  {record.total > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {record.total} {record.total === 1 ? 'jogo' : 'jogos'} &middot; {record.w}V {record.d}E {record.l}D
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum jogo registrado</p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(opponent)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(opponent.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && (
        <>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-foreground">{editingOpponent ? 'Editar adversario' : 'Novo adversario'}</SheetTitle>
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

          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent className="bg-card border-border max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Excluir adversario?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa acao nao pode ser desfeita. Todas as partidas contra esse time tambem serao excluidas.
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
