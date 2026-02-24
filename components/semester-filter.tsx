/**
 * SEMESTER FILTER
 *
 * Global filter for stats. Shows a dropdown of semesters (those with at least 1 match).
 * Updates the URL ?semester=YYYY-H so all pages use the same filter.
 */
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { formatSemester, type Semester } from '@/lib/semester'
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
  const isValidParam = semesterParam && (availableSemesters.length === 0 || availableSemesters.includes(semesterParam))
  const currentSemester = isValidParam ? semesterParam : defaultSemester

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

  const options = availableSemesters.length > 0
    ? availableSemesters
    : [defaultSemester]

  return (
    <div className="ml-auto flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Período:</span>
      <Select value={currentSemester} onValueChange={handleChange}>
        <SelectTrigger className="h-8 w-[140px] text-xs border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {formatSemester(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
