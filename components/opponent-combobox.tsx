'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createOpponentTeam } from '@/lib/create-opponent'
import {
  collapseOpponentName,
  filterOpponentsByName,
  findExactOpponent,
  normalizeOpponentSearch,
} from '@/lib/opponent-search'

export interface OpponentOption {
  id: string
  name: string
}

type Row =
  | { type: 'opponent'; id: string; name: string }
  | { type: 'create'; name: string }

interface OpponentComboboxProps {
  id?: string
  opponents: OpponentOption[]
  value: string
  onValueChange: (opponentId: string) => void
  onOpponentsChange?: (opponents: OpponentOption[]) => void
  ownerId: string
  disabled?: boolean
}

export function OpponentCombobox({
  id,
  opponents,
  value,
  onValueChange,
  onOpponentsChange,
  ownerId,
  disabled = false,
}: OpponentComboboxProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ignoreBlurRef = useRef(false)
  const queryRef = useRef('')
  const valueRef = useRef(value)
  const committedRef = useRef<OpponentOption | null>(opponents.find((opponent) => opponent.id === value) ?? null)

  const [query, setQuery] = useState(() => committedRef.current?.name ?? '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [highlightKey, setHighlightKey] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  queryRef.current = query
  valueRef.current = value

  const sortedOpponents = [...opponents].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const committed = committedRef.current
  const browsingAll = open && !!committed && normalizeOpponentSearch(query) === normalizeOpponentSearch(committed.name) && value === committed.id
  const filtered = browsingAll ? sortedOpponents : filterOpponentsByName(sortedOpponents, query)
  const typedName = collapseOpponentName(query)
  const exact = findExactOpponent(sortedOpponents, query)
  const showCreate = open && typedName.length > 0 && !exact && !browsingAll

  const rows: Row[] = [
    ...filtered.map((opponent) => ({ type: 'opponent' as const, id: opponent.id, name: opponent.name })),
    ...(showCreate ? [{ type: 'create' as const, name: typedName }] : []),
  ]

  const filterKey = `${open}:${browsingAll}:${query}:${rows.length}`
  if (highlightKey !== filterKey) {
    const selectedIndex = browsingAll ? rows.findIndex((row) => row.type === 'opponent' && row.id === value) : 0
    setHighlightKey(filterKey)
    setActiveIndex(rows.length === 0 ? -1 : selectedIndex >= 0 ? selectedIndex : 0)
  }

  const safeIndex = rows.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), rows.length - 1)
  const activeOptionId = safeIndex >= 0 ? `${listId}-option-${safeIndex}` : undefined

  useEffect(() => {
    if (!open || !activeOptionId) return
    document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' })
  }, [open, activeOptionId])

  const commitOpponent = (opponent: OpponentOption) => {
    committedRef.current = opponent
    queryRef.current = opponent.name
    valueRef.current = opponent.id
    setQuery(opponent.name)
    onValueChange(opponent.id)
    setOpen(false)
    inputRef.current?.blur()
  }

  const chooseRow = (row: Row) => {
    if (row.type === 'opponent') {
      const opponent = opponents.find((item) => item.id === row.id)
      if (opponent) commitOpponent(opponent)
      return
    }
    void createNamedOpponent(row.name)
  }

  const createNamedOpponent = async (name: string) => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const result = await createOpponentTeam(ownerId, name)
      if (result.error || !result.data) {
        toast.error(result.error || 'Erro ao criar adversário')
        return
      }

      const created = result.data
      const updated = [...opponents.filter((opponent) => opponent.id !== created.id), created]
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      onOpponentsChange?.(updated)
      commitOpponent(created)
      toast.success('Adversário adicionado')
    } finally {
      setIsCreating(false)
    }
  }

  const restoreCommitted = () => {
    const previous = committedRef.current
    if (previous) {
      queryRef.current = previous.name
      valueRef.current = previous.id
      setQuery(previous.name)
      if (value !== previous.id) onValueChange(previous.id)
      return
    }
    queryRef.current = ''
    setQuery('')
    if (value) onValueChange('')
  }

  const handleQueryChange = (next: string) => {
    queryRef.current = next
    setQuery(next)
    setOpen(true)

    const match = findExactOpponent(opponents, next)
    if (match) {
      valueRef.current = match.id
      if (value !== match.id) onValueChange(match.id)
      return
    }

    if (valueRef.current) {
      valueRef.current = ''
      onValueChange('')
    }
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const handleBlur = () => {
    window.setTimeout(() => {
      if (ignoreBlurRef.current) return
      if (containerRef.current?.contains(document.activeElement)) return

      const currentQuery = queryRef.current
      const committed = committedRef.current
      if (committed && normalizeOpponentSearch(committed.name) === normalizeOpponentSearch(currentQuery)) {
        queryRef.current = committed.name
        setQuery(committed.name)
        if (valueRef.current !== committed.id) onValueChange(committed.id)
        setOpen(false)
        return
      }

      const match = findExactOpponent(opponents, currentQuery)
      if (match) {
        committedRef.current = match
        queryRef.current = match.name
        setQuery(match.name)
        if (valueRef.current !== match.id) onValueChange(match.id)
      } else if (!collapseOpponentName(currentQuery)) {
        committedRef.current = null
        queryRef.current = ''
        setQuery('')
        if (valueRef.current) onValueChange('')
      } else if (valueRef.current) {
        valueRef.current = ''
        onValueChange('')
      }
      setOpen(false)
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
      setOpen(false)
      restoreCommitted()
      return
    }

    if (event.key === 'Enter' && open && safeIndex >= 0 && rows[safeIndex]) {
      event.preventDefault()
      chooseRow(rows[safeIndex])
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
    onClick: () => onChoose(),
  })

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? activeOptionId : undefined}
        value={query}
        disabled={disabled}
        readOnly={isCreating}
        placeholder="Buscar adversário"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="done"
        className="h-11 bg-secondary border-border pr-10"
        onFocus={(event) => {
          setOpen(true)
          const element = event.currentTarget
          requestAnimationFrame(() => element.select())
        }}
        onBlur={handleBlur}
        onChange={(event) => handleQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? 'Fechar lista de adversários' : 'Abrir lista de adversários'}
        className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center text-muted-foreground"
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) {
            setOpen(false)
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
          aria-label="Adversários"
          className="mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-md"
        >
          {rows.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Nenhum adversário cadastrado. Digite para criar.</p>
          ) : (
            <>
              {filtered.length > 0 && (
                <div className="max-h-48 overflow-y-auto overscroll-contain">
                  {filtered.map((opponent, index) => {
                    const selected = opponent.id === value
                    const active = index === safeIndex
                    return (
                      <div
                        key={opponent.id}
                        id={optionId(index)}
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          'flex min-h-11 w-full cursor-pointer items-center px-3 text-left text-sm text-foreground touch-manipulation',
                          active && 'bg-accent text-accent-foreground',
                          selected && 'font-medium',
                        )}
                        {...bindOption(index, () => chooseRow({ type: 'opponent', id: opponent.id, name: opponent.name }))}
                      >
                        <span className="truncate">{opponent.name}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {showCreate && (
                <div
                  id={optionId(filtered.length)}
                  role="option"
                  aria-selected={false}
                  aria-busy={isCreating}
                  className={cn(
                    'flex min-h-11 w-full cursor-pointer items-center gap-2 border-border px-3 text-left text-sm font-medium text-primary touch-manipulation',
                    filtered.length > 0 && 'border-t',
                    safeIndex === filtered.length && 'bg-accent',
                  )}
                  {...bindOption(filtered.length, () => {
                    if (!isCreating) chooseRow({ type: 'create', name: typedName })
                  })}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="min-w-0 break-words">
                    {isCreating ? `Criando "${typedName}"...` : `Criar "${typedName}"`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
