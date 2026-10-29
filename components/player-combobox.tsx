'use client'

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createPlayer } from '@/lib/create-player'
import { PLAYER_POSITIONS } from '@/lib/player-positions'
import { lineupPlayerResults, playerCreateName } from '@/lib/player-search'
import { findExactOpponent } from '@/lib/opponent-search'

export interface LineupPlayerOption {
  id: string
  name: string
  position?: string | null
  appearances?: number
}

type Row =
  | { type: 'player'; id: string; name: string; position: string | null }
  | { type: 'create'; name: string }
  | { type: 'position'; position: string | null; label: string }

interface PlayerComboboxProps {
  players: LineupPlayerOption[]
  excludeIds: string[]
  ownerId: string
  onAdd: (player: LineupPlayerOption) => void
  onPlayersChange?: (players: LineupPlayerOption[]) => void
  disabled?: boolean
}

export function PlayerCombobox({
  players,
  excludeIds,
  ownerId,
  onAdd,
  onPlayersChange,
  disabled = false,
}: PlayerComboboxProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ignoreBlurRef = useRef(false)
  const queryRef = useRef('')
  const isCreatingRef = useRef(false)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [highlightKey, setHighlightKey] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [pendingCreateName, setPendingCreateName] = useState<string | null>(null)
  const [createdPlayers, setCreatedPlayers] = useState<LineupPlayerOption[]>([])

  queryRef.current = query

  const roster = useMemo(() => {
    const byId = new Map<string, LineupPlayerOption>()
    for (const player of players) byId.set(player.id, player)
    for (const player of createdPlayers) {
      if (!byId.has(player.id)) byId.set(player.id, player)
    }
    return Array.from(byId.values())
  }, [players, createdPlayers])

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds])
  const results = lineupPlayerResults(roster, query, exclude)
  const createName = playerCreateName(roster, query)
  const exact = findExactOpponent(roster, query)
  const alreadyAdded = !!exact && exclude.has(exact.id)

  const positionRows: Row[] = [
    ...PLAYER_POSITIONS.map((position) => ({ type: 'position' as const, position, label: position })),
    { type: 'position' as const, position: null, label: 'Pular' },
  ]

  const rows: Row[] = pendingCreateName
    ? positionRows
    : [
        ...results.map((player) => ({
          type: 'player' as const,
          id: player.id,
          name: player.name,
          position: player.position ?? null,
        })),
        ...(createName ? [{ type: 'create' as const, name: createName }] : []),
      ]

  const filterKey = `${open}:${pendingCreateName ?? ''}:${query}:${rows.map((row) => (row.type === 'player' ? row.id : row.type === 'create' ? `create:${row.name}` : row.label)).join('|')}`
  if (highlightKey !== filterKey) {
    setHighlightKey(filterKey)
    setActiveIndex(rows.length === 0 ? -1 : 0)
  }

  const safeIndex = rows.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), rows.length - 1)
  const activeOptionId = safeIndex >= 0 ? `${listId}-option-${safeIndex}` : undefined

  useEffect(() => {
    if (!open || !activeOptionId) return
    document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' })
  }, [open, activeOptionId])

  const finishAdd = () => {
    queryRef.current = ''
    setQuery('')
    setPendingCreateName(null)
    setOpen(true)
    inputRef.current?.focus()
  }

  const rememberPlayer = (player: LineupPlayerOption) => {
    setCreatedPlayers((current) => (current.some((item) => item.id === player.id) ? current : [...current, player]))
    const byId = new Map(roster.map((item) => [item.id, item]))
    byId.set(player.id, player)
    onPlayersChange?.(Array.from(byId.values()))
  }

  const createNamedPlayer = async (name: string, position: string | null) => {
    if (isCreatingRef.current) return
    isCreatingRef.current = true
    setIsCreating(true)
    inputRef.current?.focus()
    try {
      const result = await createPlayer(ownerId, name, position)
      if (result.error || !result.data) {
        toast.error(result.error || 'Erro ao cadastrar jogador')
        return
      }

      const created: LineupPlayerOption = {
        id: result.data.id,
        name: result.data.name,
        position: result.data.position,
        appearances: 0,
      }
      rememberPlayer(created)
      onAdd(created)
      toast.success('Jogador cadastrado')
      finishAdd()
    } finally {
      isCreatingRef.current = false
      setIsCreating(false)
    }
  }

  const chooseRow = (row: Row) => {
    if (disabled) return
    if (row.type === 'player') {
      const player = roster.find((item) => item.id === row.id)
      if (!player || exclude.has(player.id)) return
      onAdd(player)
      finishAdd()
      return
    }

    if (row.type === 'create') {
      setPendingCreateName(row.name)
      setOpen(true)
      inputRef.current?.focus()
      return
    }

    if (!pendingCreateName || isCreatingRef.current) return
    void createNamedPlayer(pendingCreateName, row.position)
  }

  const handleQueryChange = (next: string) => {
    queryRef.current = next
    setQuery(next)
    setPendingCreateName(null)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setPendingCreateName(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const handleBlur = () => {
    window.setTimeout(() => {
      if (ignoreBlurRef.current || isCreatingRef.current) return
      if (containerRef.current?.contains(document.activeElement)) return
      setOpen(false)
      setPendingCreateName(null)
    }, 200)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      if (rows.length === 0) return
      setActiveIndex((index) => Math.min(index < 0 ? 0 : index + 1, rows.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      if (pendingCreateName) {
        setPendingCreateName(null)
        return
      }
      setOpen(false)
      return
    }

    if (event.key === 'Enter') {
      if (!open) {
        event.preventDefault()
        setOpen(true)
        return
      }
      if (safeIndex >= 0 && rows[safeIndex]) {
        event.preventDefault()
        chooseRow(rows[safeIndex])
      }
    }
  }

  const optionId = (index: number) => `${listId}-option-${index}`

  const bindOption = (index: number, onChoose: () => void) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') event.preventDefault()
      ignoreBlurRef.current = true
    },
    onPointerEnter: () => setActiveIndex(index),
    onPointerCancel: () => {
      ignoreBlurRef.current = false
    },
    onPointerUp: () => {
      ignoreBlurRef.current = false
    },
    onClick: () => {
      ignoreBlurRef.current = false
      onChoose()
    },
  })

  const emptyMessage = (() => {
    if (query.trim()) {
      if (alreadyAdded) return 'Já está na escalação'
      return null
    }
    if (roster.length === 0) return 'Nenhum jogador cadastrado. Digite para criar.'
    return 'Todos os jogadores já estão na escalação. Digite para criar.'
  })()

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? activeOptionId : undefined}
        aria-label="Buscar jogador"
        value={query}
        disabled={disabled}
        readOnly={isCreating}
        placeholder="Buscar jogador"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="search"
        className="h-11 bg-secondary border-border pr-10"
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onChange={(event) => handleQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? 'Fechar lista de jogadores' : 'Abrir lista de jogadores'}
        className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center text-muted-foreground"
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) {
            setOpen(false)
            setPendingCreateName(null)
            return
          }
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        <ChevronDown className={cn('h-4 w-4 opacity-60 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={pendingCreateName ? 'Posição do novo jogador' : 'Jogadores'}
          className="mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-md"
        >
          {pendingCreateName ? (
            <div className="px-3 py-3">
              <p className="text-sm font-medium text-foreground break-words">
                {isCreating ? `Criando "${pendingCreateName}"...` : `Criar "${pendingCreateName}"`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Posição</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLAYER_POSITIONS.map((position, index) => {
                  const active = index === safeIndex
                  return (
                    <div
                      key={position}
                      id={optionId(index)}
                      role="option"
                      aria-selected={false}
                      aria-disabled={isCreating}
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center rounded-full px-3 text-sm font-medium touch-manipulation',
                        active ? 'bg-accent text-accent-foreground ring-2 ring-primary' : 'bg-muted text-foreground',
                        isCreating && 'pointer-events-none opacity-60',
                      )}
                      {...bindOption(index, () => chooseRow({ type: 'position', position, label: position }))}
                    >
                      {position}
                    </div>
                  )
                })}
              </div>
              <div
                id={optionId(PLAYER_POSITIONS.length)}
                role="option"
                aria-selected={false}
                aria-disabled={isCreating}
                className={cn(
                  'mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg border border-border text-sm font-medium text-muted-foreground touch-manipulation',
                  safeIndex === PLAYER_POSITIONS.length && 'bg-accent text-accent-foreground',
                  isCreating && 'pointer-events-none opacity-60',
                )}
                {...bindOption(PLAYER_POSITIONS.length, () => chooseRow({ type: 'position', position: null, label: 'Pular' }))}
              >
                Pular
              </div>
            </div>
          ) : rows.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">{emptyMessage ?? 'Nenhum jogador encontrado'}</p>
          ) : (
            <>
              {results.length > 0 && (
                <div className="max-h-48 overflow-y-auto overscroll-contain">
                  {alreadyAdded && (
                    <p className="px-3 pt-2 text-xs text-muted-foreground">Já está na escalação</p>
                  )}
                  {results.map((player, index) => {
                    const active = index === safeIndex
                    return (
                      <div
                        key={player.id}
                        id={optionId(index)}
                        role="option"
                        aria-selected={false}
                        className={cn(
                          'flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm text-foreground touch-manipulation',
                          active && 'bg-accent text-accent-foreground',
                        )}
                        {...bindOption(index, () => chooseRow({
                          type: 'player',
                          id: player.id,
                          name: player.name,
                          position: player.position ?? null,
                        }))}
                      >
                        <span className="min-w-0 flex-1 truncate">{player.name}</span>
                        {player.position ? (
                          <span className="shrink-0 text-xs text-muted-foreground">{player.position}</span>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}

              {createName && (
                <div
                  id={optionId(results.length)}
                  role="option"
                  aria-selected={false}
                  className={cn(
                    'flex min-h-11 w-full cursor-pointer items-center gap-2 border-border px-3 text-left text-sm font-medium text-primary touch-manipulation',
                    results.length > 0 && 'border-t',
                    safeIndex === results.length && 'bg-accent',
                  )}
                  {...bindOption(results.length, () => chooseRow({ type: 'create', name: createName }))}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="min-w-0 break-words">{`Criar "${createName}"`}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
