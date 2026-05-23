'use client'

import type { ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { StatCard } from '@/components/stat-card'
import { RecentMatches } from '@/components/recent-matches'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type { DashboardStats, PlayerRateStat } from '@/lib/dashboard-stats'

const timelineChartConfig = {
  golsFor: { label: 'Marcados', color: 'hsl(var(--chart-1))' },
  golsAgainst: { label: 'Sofridos', color: 'hsl(var(--chart-3))' },
}

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
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
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

function formatRate(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

function AttackRankingList({
  title,
  accentClass,
  barClass,
  items,
  emptyMessage,
}: {
  title: string
  accentClass: string
  barClass: string
  items: PlayerRateStat[]
  emptyMessage: string
}) {
  const max = items[0]?.value ?? 1

  return (
    <div>
      <p className={cn('mb-2 text-xs font-semibold uppercase tracking-wide', accentClass)}>{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((player, i) => (
            <div key={player.name} className="relative overflow-hidden rounded-lg px-1 py-1.5">
              <div
                className={cn('absolute inset-y-0 left-0 rounded-lg opacity-60', barClass)}
                style={{ width: `${Math.max(8, (player.value / max) * 100)}%` }}
              />
              <div className="relative flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{player.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {player.matches} {player.matches === 1 ? 'Jogo' : 'Jogos'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-foreground">{player.value}</p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {player.matches > 0 ? `${formatRate(player.perMatch)}/jogo` : '—'}
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

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[160px] items-center justify-center rounded-lg bg-muted/30">
      <p className="text-xs text-muted-foreground">{message}</p>
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
                <div className="flex flex-wrap gap-1.5">
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
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Saldo de gols"
              value={stats.saldoGols >= 0 ? `+${stats.saldoGols}` : `${stats.saldoGols}`}
              accent={stats.saldoGols >= 0 ? 'primary' : 'destructive'}
            />
            <StatCard label="Média marcados" value={stats.avgGolsFor} accent="primary" />
            <StatCard label="Média sofridos" value={stats.avgGolsAgainst} accent="destructive" />
            <StatCard label="Clean sheets" value={stats.cleanSheets} accent="muted" />
          </div>

          <SectionCard title="Gols por Partida" description="Evolução ao longo do período">
            {stats.goalsTimeline.length === 0 ? (
              <EmptyChart message="Sem partidas" />
            ) : (
              <ChartContainer config={timelineChartConfig} className="h-[200px] w-full">
                <LineChart data={stats.goalsTimeline} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 9 }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={56}
                    tickFormatter={(value: string) => (value.length > 12 ? `${value.slice(0, 11)}…` : value)}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload
                          return item ? `${item.label} · ${item.date}` : ''
                        }}
                      />
                    }
                  />
                  <Line type="monotone" dataKey="golsFor" stroke="var(--color-golsFor)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="golsAgainst" stroke="var(--color-golsAgainst)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            )}
          </SectionCard>

          <SectionCard title="Gols e Assistências" description="Top 10 — eficiência por partida disputada">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
              <AttackRankingList
                title="Artilheiros"
                accentClass="text-primary"
                barClass="bg-primary/10"
                items={stats.topGoalScorers}
                emptyMessage="Sem gols registrados"
              />
              <AttackRankingList
                title="Assistências"
                accentClass="text-[hsl(var(--chart-4))]"
                barClass="bg-[hsl(var(--chart-4))]/10"
                items={stats.topAssistProviders}
                emptyMessage="Sem assistências registradas"
              />
            </div>
          </SectionCard>

          {/* Appearances */}
          <SectionCard title="Mais Escalados" description="Presença no elenco">
              {stats.topAppearances.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem escalações</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {stats.topAppearances.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <span className="w-4 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, (p.matches / stats.totalMatches) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{p.matches}</p>
                        <p className="text-[10px] text-muted-foreground">{p.starterRate}% tit.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </SectionCard>

          {/* Duos + cards (conditional) */}
          {(stats.topDuos.length > 0 || stats.totalYellows + stats.totalReds > 0) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {stats.topDuos.length > 0 && (
                <SectionCard title="Duplas Produtivas" description="Assistência → gol">
                  <div className="flex flex-col gap-2">
                    {stats.topDuos.slice(0, 4).map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-foreground">
                          <span className="font-medium text-muted-foreground">{i + 1}.</span> {d.name}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-primary">{d.value}×</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {(stats.totalYellows + stats.totalReds > 0) && (
                <SectionCard title="Cartões" description={`${stats.totalYellows} amarelos · ${stats.totalReds} vermelhos`}>
                  <div className="flex flex-col gap-2">
                    {stats.topYellows.slice(0, 3).map(p => (
                      <div key={p.name} className="flex items-center justify-between">
                        <span className="truncate text-sm text-foreground">{p.name}</span>
                        <span className="text-sm font-bold text-warning">{p.value} amarelo{p.value !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                    {stats.topReds.slice(0, 2).map(p => (
                      <div key={p.name} className="flex items-center justify-between">
                        <span className="truncate text-sm text-foreground">{p.name}</span>
                        <span className="text-sm font-bold text-destructive">{p.value} vermelho{p.value !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          <RecentMatches matches={stats.recentMatches} />
        </div>
      )}
    </div>
  )
}
