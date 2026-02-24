/**
 * PLAYERS LIST COMPONENT
 *
 * Renders the list of players on the Jogadores page.
 * Each player card shows: name, position, and stats (Partidas, Gols, Assist.) in a horizontal row.
 * Includes a search bar to filter players by name.
 *
 * Hidden for now (still collected): Presença, Titular, Cartões Amarelos, Cartões Vermelhos.
 */
'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PlayerForm } from '@/components/player-form'
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

interface PlayerStats {
  id: string
  name: string
  position: string | null
  whatsapp: string | null
  matches_played: number
  matches_starter: number
  total_matches: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  inNegotiation: boolean
}

export function PlayersList({ players, ownerId, autoOpen = false, readOnly = false }: { players: PlayerStats[]; ownerId: string; autoOpen?: boolean; readOnly?: boolean }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<PlayerStats | undefined>(undefined)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players
    const q = search.trim().toLowerCase()
    return players.filter(p => p.name.toLowerCase().includes(q))
  }, [players, search])

  const refreshData = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  useEffect(() => {
    if (autoOpen) {
      setEditingPlayer(undefined)
      setSheetOpen(true)
    }
  }, [autoOpen])

  const handleDelete = async () => {
    if (!deleteId) return
    const supabase = createClient()
    const { error } = await supabase.from('players').delete().eq('id', deleteId)
    if (error) {
      toast.error('Erro ao excluir jogador. Verifique se não há eventos vinculados.')
    } else {
      toast.success('Jogador excluído')
      refreshData()
    }
    setDeleteId(null)
  }

  return (
    <>
      {isPending && <LoadingOverlay />}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Jogadores</h1>
          <p className="text-sm text-muted-foreground">{players.length} {players.length === 1 ? 'jogador' : 'jogadores'}</p>
        </div>
        {!readOnly && (
        <Button onClick={() => { setEditingPlayer(undefined); setSheetOpen(true) }} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Adicionar
        </Button>
        )}
      </div>

      {/* Search bar */}
      {players.length > 0 && (
        <div className="relative mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar jogador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}

      {players.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mb-3 text-muted-foreground/50">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <p className="text-sm text-muted-foreground">Nenhum jogador encontrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredPlayers.map((player) => (
            <div key={player.id} className={cn(
              'rounded-xl border bg-card p-3',
              player.inNegotiation ? 'border-destructive/30' : 'border-border'
            )}>
              {/* Player header */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                  player.inNegotiation ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                )}>
                  {player.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{player.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{player.position || 'Sem posição'}</p>
                </div>

                {/* Inline stats */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <p className="text-[10px] leading-tight text-muted-foreground">Partidas</p>
                    <p className="text-sm font-bold text-foreground">{player.matches_played}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] leading-tight text-muted-foreground">Gols</p>
                    <p className="text-sm font-bold text-primary">{player.goals}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] leading-tight text-muted-foreground">Assist.</p>
                    <p className="text-sm font-bold text-foreground">{player.assists}</p>
                  </div>
                </div>

                {!readOnly && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => { setEditingPlayer(player); setSheetOpen(true) }}
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
                    onClick={() => setDeleteId(player.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </Button>
                </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl max-h-[85svh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-foreground">{editingPlayer ? 'Editar jogador' : 'Novo jogador'}</SheetTitle>
          </SheetHeader>
          <PlayerForm
            player={editingPlayer ? { id: editingPlayer.id, name: editingPlayer.name, position: editingPlayer.position, whatsapp: editingPlayer.whatsapp } : undefined}
            ownerId={ownerId}
            onClose={() => setSheetOpen(false)}
            onRefresh={refreshData}
          />
        </SheetContent>
      </Sheet>
      )}

      {!readOnly && (
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir jogador?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Todos os eventos vinculados a esse jogador também serão excluídos.
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
