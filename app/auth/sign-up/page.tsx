'use client'

import React, { Suspense } from "react"

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { acceptInviteAction } from '@/app/auth/aceitar-convite/actions'

function SignUpForm() {
  const searchParams = useSearchParams()
  const emailFromUrl = searchParams.get('email') || ''
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const teamNameFromUrl = searchParams.get('teamName') || ''
  const tokenFromUrl = searchParams.get('token') || ''
  const isInviteFlow = !!teamNameFromUrl

  const [email, setEmail] = useState(emailFromUrl)
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('As senhas não coincidem')
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: isInviteFlow ? emailFromUrl : email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/dashboard`,
          data: {
            team_name: isInviteFlow ? (teamNameFromUrl || 'Meu Time') : teamName,
          },
        },
      })
      
      if (error) {
        // Check for rate limit error
        if (error.message?.toLowerCase().includes('rate limit') || error.message?.toLowerCase().includes('email rate limit')) {
          setError('Limite de e-mails excedido. Aguarde alguns minutos e tente novamente.')
        } else {
          throw error
        }
      } else if (data?.user) {
        if (isInviteFlow && tokenFromUrl) {
          const result = await acceptInviteAction(tokenFromUrl)
          if (result.success) {
            router.push(`/dashboard?welcome=1&teamName=${encodeURIComponent(result.teamName || teamNameFromUrl || 'Meu Time')}`)
            return
          }
          setError(result.error || 'Erro ao aceitar convite.')
          return
        }
        router.push(redirectTo)
      } else {
        setError('Erro ao criar conta. Tente novamente.')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro'
      if (errorMessage.toLowerCase().includes('rate limit')) {
        setError('Limite de e-mails excedido. Aguarde alguns minutos e tente novamente.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 2C12 2 8 6 8 12s4 10 4 10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 2c0 0 4 4 4 10s-4 10-4 10" stroke="currentColor" strokeWidth="2" />
              <path d="M2 12h20" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isInviteFlow ? 'Você está se juntando ao time como administrador' : 'Registre seu time e comece a acompanhar'}
          </p>
        </div>
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="teamName" className="text-muted-foreground">Time</Label>
            <Input
              id="teamName"
              type="text"
              placeholder="FC Pelada"
              required={!isInviteFlow}
              value={isInviteFlow ? (teamNameFromUrl || 'Meu Time') : teamName}
              onChange={(e) => !isInviteFlow && setTeamName(e.target.value)}
              readOnly={isInviteFlow}
              disabled={isInviteFlow}
              className="h-11 bg-secondary border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              required
              value={isInviteFlow ? emailFromUrl : email}
              onChange={(e) => !isInviteFlow && setEmail(e.target.value)}
              readOnly={isInviteFlow}
              disabled={isInviteFlow}
              className="h-11 bg-secondary border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-muted-foreground">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-secondary border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="repeat-password" className="text-muted-foreground">Confirmar senha</Label>
            <Input
              id="repeat-password"
              type="password"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              className="h-11 bg-secondary border-border"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? 'Criando...' : 'Criar conta'}
          </Button>
          {!isInviteFlow && (
            <p className="text-center text-sm text-muted-foreground">
              {'Já tem conta? '}
              <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
                Entrar
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center p-6">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
