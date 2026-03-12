/**
 * PERIOD FILTER
 *
 * Global filter for stats. Shows a dropdown of years (those with at least 1 match)
 * plus "Tudo" (all time). Updates ?semester= URL param so all pages share the filter.
 */
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { type Semester } from '@/lib/semester'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SemesterFilterProps {
  availableSemesters: Semester[]
  defaultSemester: Semester
}

export function SemesterFilter({ availableSemesters, defaultSemester }: SemesterFilterProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const semesterParam = searchParams.get('semester')
  const isValidParam =
    semesterParam === 'all' ||
    semesterParam === defaultSemester ||
    (semesterParam !== null && availableSemesters.includes(semesterParam))
  const currentSemester = isValidParam && semesterParam ? semesterParam : defaultSemester

  // Sync URL when semester is missing or invalid (e.g. first load)
  useEffect(() => {
    if (!isValidParam) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('semester', defaultSemester)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [pathname, searchParams, isValidParam, defaultSemester, router])

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('semester', value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Build year options: include current year even if no matches yet
  const yearOptions = availableSemesters.includes(defaultSemester)
    ? availableSemesters
    : [defaultSemester, ...availableSemesters].sort((a, b) => Number(b) - Number(a))

  return (
    <div className="ml-auto flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Período:</span>
      <Select value={currentSemester} onValueChange={handleChange}>
        <SelectTrigger className="h-8 w-[100px] text-xs border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((y) => (
            <SelectItem key={y} value={y} className="text-xs">
              {y}
            </SelectItem>
          ))}
          <SelectItem value="all" className="text-xs">
            Tudo
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
