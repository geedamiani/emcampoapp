'use client'

import React from "react"

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Ocorreu um erro')
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meu Time</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre para acompanhar as estatisticas</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {'Nao tem conta? '}
            <Link href="/auth/sign-up" className="text-primary underline-offset-4 hover:underline">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
