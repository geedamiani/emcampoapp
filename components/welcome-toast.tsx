'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function WelcomeToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shown = useRef(false)

  useEffect(() => {
    const welcome = searchParams.get('welcome')
    const teamName = searchParams.get('teamName') || 'Meu Time'
    if (welcome === '1' && !shown.current) {
      shown.current = true
      toast.success(`Tudo certo! Você agora pode acessar a conta "${teamName}".`)
      router.replace('/dashboard')
    }
  }, [searchParams, router])

  return null
}
