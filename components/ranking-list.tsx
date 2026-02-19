import { cn } from '@/lib/utils'

interface RankingItem {
  name: string
  value: number
}

interface RankingListProps {
  title: string
  items: RankingItem[]
  emptyMessage?: string
  accent?: 'primary' | 'warning' | 'destructive'
  valueLabel?: string
}

export function RankingList({ title, items, emptyMessage = 'Nenhum dado', accent = 'primary', valueLabel }: RankingListProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.slice(0, 5).map((item, i) => (
            <div key={item.name + i} className="flex items-center gap-3">
              <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </p>
              </div>
              <span className="text-sm font-bold text-foreground">
                {item.value}
                {valueLabel && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{valueLabel}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
