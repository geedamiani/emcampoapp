'use client'

import type { ReactNode } from 'react'
import { StatCard } from '@/components/stat-card'
import { RecentMatches } from '@/components/recent-matches'
import { cn } from '@/lib/utils'
import type { DashboardStats, PlayerRateStat } from '@/lib/dashboard-stats'

const formColors = {
  V: 'bg-primary text-primary-foreground',
  E: 'bg-muted text-muted-foreground',
  D: 'bg-destructive text-destructive-foreground',
}

function SectionCard({ title, description, children, className }: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-3 sm:p-4', className)}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function AproveitamentoRing({ value }: { value: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="7"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-lg font-bold tabular-nums text-foreground">{value}%</span>
    </div>
  )
}

function formatRate(value: number, fractionDigits: 1 | 2 = 1) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  })
}

function formatStatValue(value: number) {
  if (Number.isInteger(value)) return value.toLocaleString('pt-BR')
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function RankingColumn({
  title,
  accentClass,
  barClass,
  items,
  emptyMessage,
  showMatches = true,
  valueCaption = 'rate',
  rateDigits = 1,
}: {
  title: string
  accentClass: string
  barClass: string
  items: PlayerRateStat[]
  emptyMessage: string
  /** Second line under the name, e.g. "24 Jogos". */
  showMatches?: boolean
  /** Small text under the total: per-match rate, or "jogo"/"jogos". */
  valueCaption?: 'rate' | 'unit'
  rateDigits?: 1 | 2
}) {
  const max = Math.max(...items.map(item => item.value), 0)
  const scale = max > 0 ? max : 1

  return (
    <div className="min-w-0">
      <p className={cn('mb-1.5 text-[10px] font-semibold uppercase leading-tight tracking-wide sm:mb-2 sm:text-xs', accentClass)}>
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-0.5 sm:gap-1">
          {items.map((player, i) => (
            <div key={player.id ?? `${player.name}-${i}`} className="relative overflow-hidden rounded-md px-0.5 py-1 sm:rounded-lg sm:px-1 sm:py-1.5">
              <div
                className={cn('absolute inset-y-0 left-0 rounded-md opacity-60 sm:rounded-lg', barClass)}
                style={{ width: `${Math.max(8, (player.value / scale) * 100)}%` }}
              />
              <div className="relative flex min-w-0 items-center gap-1 sm:gap-2">
                <span className="w-4 shrink-0 text-center text-[10px] font-bold tabular-nums text-muted-foreground sm:w-5 sm:text-xs">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium leading-tight text-foreground sm:text-sm" title={player.name}>{player.name}</p>
                  {showMatches && (
                    <p className="truncate text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
                      {player.matches} {player.matches === 1 ? 'Jogo' : 'Jogos'}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-bold tabular-nums leading-tight text-foreground sm:text-sm">
                    {formatStatValue(player.value)}
                  </p>
                  <p className="whitespace-nowrap text-[9px] tabular-nums leading-tight text-muted-foreground sm:text-[10px]">
                    {valueCaption === 'unit'
                      ? (player.value === 1 ? 'jogo' : 'jogos')
                      : player.matches > 0 ? `${formatRate(player.perMatch, rateDigits)}/jogo` : '—'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function concededLabel(value: number) {
  const formatted = formatStatValue(value)
  return value === 1 ? `${formatted} gol sofrido` : `${formatted} gols sofridos`
}

function GoalkeeperList({ items }: { items: PlayerRateStat[] }) {
  const max = Math.max(...items.map(item => item.matches), 0)
  const scale = max > 0 ? max : 1

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum goleiro escalado</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((player, i) => (
        <div key={player.id ?? `${player.name}-${i}`} className="relative overflow-hidden rounded-lg px-1 py-1.5">
          <div
            className="absolute inset-y-0 left-0 rounded-lg bg-[hsl(var(--chart-2))]/15 opacity-60"
            style={{ width: `${Math.max(8, (player.matches / scale) * 100)}%` }}
          />
          <div className="relative flex min-w-0 items-center gap-3">
            <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground" title={player.name}>{player.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{concededLabel(player.conceded ?? 0)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold tabular-nums leading-tight text-foreground">
                {player.matches}
                <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                  {player.matches === 1 ? 'jogo' : 'jogos'}
                </span>
              </p>
              <p className="whitespace-nowrap text-[10px] tabular-nums leading-tight text-muted-foreground">
                {player.matches > 0 ? `${formatRate(player.perMatch, 2)}/jogo` : '—'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardOverview({ stats, readOnly = false }: { stats: DashboardStats; readOnly?: boolean }) {
  const hasMatches = stats.totalMatches > 0

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      {readOnly && (
        <div className="mb-4 flex justify-end">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            Somente leitura
          </span>
        </div>
      )}

      {!hasMatches ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-3 text-muted-foreground/40">
            <path d="M12 20V10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M18 20V4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 20v-4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="text-sm font-medium text-foreground">Sem dados neste período</p>
          <p className="mt-1 text-xs text-muted-foreground">Registre partidas para ver estatísticas e gráficos.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Hero: aproveitamento + record */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-4">
              <AproveitamentoRing value={stats.aproveitamento} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Aproveitamento</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {stats.wins}V {stats.draws}E {stats.losses}D
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stats.wins * 3 + stats.draws} pts de {stats.totalMatches * 3} possíveis
                </p>
              </div>
            </div>
            {stats.form.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Forma recente</p>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {stats.form.map((f, i) => (
                    <div
                      key={`${f.date}-${i}`}
                      title={`${f.result} vs ${f.opponent} (${f.score}) — ${f.date}`}
                      className={cn(
                        'flex h-8 min-w-[2rem] items-center justify-center rounded-md px-1.5 text-xs font-bold',
                        formColors[f.result],
                      )}
                    >
                      {f.result}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <StatCard
                nested
                label="Saldo de gols"
                value={stats.saldoGols >= 0 ? `+${stats.saldoGols}` : `${stats.saldoGols}`}
                accent={stats.saldoGols >= 0 ? 'primary' : 'destructive'}
              />
              <StatCard nested label="Média marcados" value={stats.avgGolsFor} accent="primary" />
              <StatCard nested label="Média sofridos" value={stats.avgGolsAgainst} accent="destructive" />
              <StatCard nested label="Clean sheets" value={stats.cleanSheets} accent="muted" />
            </div>
          </div>

          <RecentMatches matches={stats.recentMatches} />

          <SectionCard title="Gols e Assistências" description="Top 10 — eficiência por partida disputada">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <RankingColumn
                title="Artilheiros"
                accentClass="text-primary"
                barClass="bg-primary/10"
                items={stats.topGoalScorers}
                emptyMessage="Sem gols registrados"
              />
              <RankingColumn
                title="Assistências"
                accentClass="text-[hsl(var(--chart-4))]"
                barClass="bg-[hsl(var(--chart-4))]/10"
                items={stats.topAssistProviders}
                emptyMessage="Sem assistências registradas"
              />
            </div>
          </SectionCard>

          <SectionCard title="Goleiros" description="Top 10 — mais partidas, com gols sofridos">
            <GoalkeeperList items={stats.goalkeepersByMatches} />
          </SectionCard>
        </div>
      )}
    </div>
  )
}
