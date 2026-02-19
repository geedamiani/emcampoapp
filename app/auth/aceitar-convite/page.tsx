'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getInviteByToken } from './actions'

function AceitarConviteContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'need-auth'>('loading')
  const [message, setMessage] = useState('')
  const [teamName, setTeamName] = useState<string>('')
  const [inviteEmail, setInviteEmail] = useState<string>('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Link de convite inválido.')
      return
    }

    const acceptInvite = async () => {
      const result = await getInviteByToken(token)
      if (!result.success || !result.invite) {
        setStatus('error')
        setMessage(result.error || 'Convite expirado ou inválido.')
        return
      }
      const invite = result.invite

      setTeamName(invite.team_name || 'Meu Time')
      setInviteEmail(invite.email || '')

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setStatus('need-auth')
        setMessage('Crie uma conta para aceitar o convite e gerenciar o time.')
        return
      }

      if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
        setStatus('error')
        setMessage(`Este convite foi enviado para ${invite.email}. Use esse e-mail para criar a conta.`)
        return
      }

      const { error } = await supabase.from('team_admins').insert({
        owner_id: invite.owner_id,
        admin_id: user.id,
      })

      if (error) {
        if (error.code === '23505') {
          setStatus('success')
          setMessage('Você já é administrador deste time.')
        } else {
          setStatus('error')
          setMessage('Erro ao aceitar convite.')
        }
        return
      }

      await supabase.from('pending_invites').delete().eq('token', token)
      setStatus('success')
      setMessage('Convite aceito! Você agora pode gerenciar o time.')
    }

    acceptInvite()
  }, [token])

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            <p className="text-muted-foreground">Processando convite...</p>
          </>
        )}

        {status === 'need-auth' && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Convite recebido</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <div className="mt-6">
              <Button asChild className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href={`/auth/sign-up?token=${encodeURIComponent(token!)}&teamName=${encodeURIComponent(teamName)}&email=${encodeURIComponent(inviteEmail)}`}>
                  Criar conta
                </Link>
              </Button>
            </div>
          </>
        )}

        {(status === 'success' || status === 'error') && (
          <>
            <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${status === 'success' ? 'bg-primary/10' : 'bg-destructive/10'}`}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className={status === 'success' ? 'text-primary' : 'text-destructive'}>
                {status === 'success' ? (
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M15 9 L9 15 M9 9 L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {status === 'success' ? 'Pronto!' : 'Algo deu errado'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Button asChild className="mt-6 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/dashboard">Ir para o painel</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function AceitarConvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    }>
      <AceitarConviteContent />
    </Suspense>
  )
}
