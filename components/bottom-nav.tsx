'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Início',
    href: '/dashboard',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={cn(active ? 'text-primary' : 'text-muted-foreground')}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Jogadores',
    href: '/dashboard/jogadores',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={cn(active ? 'text-primary' : 'text-muted-foreground')}>
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Partidas',
    href: '/dashboard/partidas',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={cn(active ? 'text-primary' : 'text-muted-foreground')}>
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Adversários',
    href: '/dashboard/adversarios',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={cn(active ? 'text-primary' : 'text-muted-foreground')}>
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 22h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 14.66V17c0 1.1-.9 2-2 2H8c-1.1 0-2 .9-2 2M14 14.66V17c0 1.1.9 2 2 2h0c1.1 0 2 .9 2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <rect x="6" y="4" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const isPublicView = pathname.startsWith('/t/')
  const token = isPublicView ? pathname.split('/')[2] : null
  const baseHref = token ? `/t/${token}` : '/dashboard'

  const navItemsWithHref = navItems.map((item) => {
    const path = item.href === '/dashboard' ? baseHref : `${baseHref}${item.href.replace('/dashboard', '')}`
    const params = searchParams.toString()
    return { ...item, href: params ? `${path}?${params}` : path }
  })

  const handleNavigate = (href: string) => {
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <>
      {/* Top loading bar */}
      {isPending && (
        <div className="fixed top-0 left-0 right-0 z-[100]">
          <div className="h-0.5 w-full bg-muted overflow-hidden">
            <div className="h-full w-1/3 bg-primary animate-[shimmer_1s_ease-in-out_infinite] rounded-full" />
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl safe-area-bottom" role="navigation" aria-label="Menu principal">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 pb-1 pt-2">
          {navItemsWithHref.map((item) => {
            const pathOnly = item.href.split('?')[0]
            const isActive = pathOnly === baseHref
              ? pathname === baseHref || pathname === `${baseHref}/`
              : pathname.startsWith(pathOnly)
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => handleNavigate(item.href)}
                disabled={isPending}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-all',
                  'active:scale-90 active:opacity-70',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                  isPending && 'opacity-60 pointer-events-none'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon(isActive)}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
