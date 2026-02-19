'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createInviteAction, deletePendingInviteAction } from '@/app/dashboard/configuracoes/actions'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UserWithAccess {
  id: string
  email: string
  role: 'owner' | 'admin'
  created_at: string
}

interface InviteAdminsProps {
  ownerId: string
  teamName: string
  usersWithAccess: UserWithAccess[]
  pendingInvites: { id: string; email: string; token: string; team_name?: string | null; created_at: string; expires_at: string }[]
  migrationNeeded?: boolean
}

export function InviteAdmins({ ownerId, teamName, usersWithAccess, pendingInvites, migrationNeeded }: InviteAdminsProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    const result = await deletePendingInviteAction(deleteId, ownerId)
    if (result.success) {
      toast.success('Convite excluído')
      setDeleteId(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Erro ao excluir convite')
    }
    setIsDeleting(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const result = await createInviteAction(ownerId, email.trim(), origin, teamName)

    if (!result.success) {
      toast.error(result.error || 'Erro ao criar convite')
      setIsLoading(false)
      return
    }

    if (result.inviteLink) {
      await navigator.clipboard.writeText(result.inviteLink)
      toast.success('Link copiado! Envie por WhatsApp ou como preferir.')
    }
    setEmail('')
    setIsLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {migrationNeeded && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Para convidar administradores, execute o script <code className="rounded bg-amber-500/20 px-1 py-0.5 text-xs">scripts/004_team_admins.sql</code> no Supabase (SQL Editor).
          </p>
        </div>
      )}

      {/* Users section */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Usuários</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {usersWithAccess.length} {usersWithAccess.length === 1 ? 'usuário com acesso' : 'usuários com acesso'}
          </p>
        </div>

        {/* Current users/admins */}
        {usersWithAccess.length > 0 && (
          <div className="mb-4 space-y-2">
            {usersWithAccess.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {u.email || 'Carregando...'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.role === 'owner' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                      {u.role === 'owner' ? 'Dono' : 'Admin'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {u.role === 'owner' ? 'Conta principal' : `Acesso desde ${new Date(u.created_at).toLocaleDateString('pt-BR')}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invite form */}
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <form onSubmit={handleInvite} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 bg-background border-border"
                required
              />
            </div>
            <Button type="submit" size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? 'Gerando...' : 'Convidar'}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            O link será copiado automaticamente. Envie por WhatsApp ou como preferir.
          </p>
        </div>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Convites pendentes</h2>
          <ul className="space-y-3">
            {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{inv.email}</span>
                    <span className="text-xs text-muted-foreground">
                      Expira em {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-border text-muted-foreground"
                      onClick={async () => {
                        const link = `${window.location.origin}/auth/aceitar-convite?token=${inv.token}`
                        await navigator.clipboard.writeText(link)
                        toast.success('Link copiado!')
                      }}
                    >
                      Copiar link
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(inv.id)}
                      aria-label="Excluir convite"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </Button>
                  </div>
                </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O convite será cancelado e o link deixará de funcionar. O convidado poderá ser convidado novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
