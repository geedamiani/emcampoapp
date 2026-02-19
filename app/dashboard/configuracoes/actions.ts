/**
 * CONFIGURAÇÕES - Server Actions
 *
 * Actions for invite management:
 * - createInviteAction: creates a pending invite with a unique token + expiry link.
 * - deletePendingInviteAction: removes a pending invite.
 * - getAdminEmailsAction: fetches admin emails (needs admin client).
 */
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function createInviteAction(
  ownerId: string,
  email: string,
  origin: string,
  teamName: string
): Promise<{ success: boolean; error?: string; inviteLink?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Faça login para convidar.' }

  const effectiveOwner = await getEffectiveOwnerId(supabase, user.id)
  if (effectiveOwner !== user.id) return { success: false, error: 'Apenas o dono do time pode convidar administradores.' }
  if (ownerId !== user.id) return { success: false, error: 'Permissão negada.' }

  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { error } = await supabase.from('pending_invites').insert({
    owner_id: ownerId,
    email: email.trim().toLowerCase(),
    token,
    expires_at: expiresAt.toISOString(),
    team_name: teamName || null,
  })

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Este e-mail já foi convidado.' }
    if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('pending_invites')) {
      return { success: false, error: 'A tabela de convites não existe. Execute o script scripts/004_team_admins.sql no Supabase (SQL Editor) e tente novamente.' }
    }
    if (error.code === '42501') return { success: false, error: 'Sem permissão para criar convite.' }
    return { success: false, error: error.message || 'Erro ao criar convite.' }
  }

  const inviteLink = `${origin || process.env.NEXT_PUBLIC_APP_URL || ''}/auth/aceitar-convite?token=${token}`
  return { success: true, inviteLink }
}

export async function deletePendingInviteAction(
  inviteId: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Faça login para continuar.' }

  const effectiveOwner = await getEffectiveOwnerId(supabase, user.id)
  if (effectiveOwner !== user.id || ownerId !== user.id) return { success: false, error: 'Permissão negada.' }

  const { error } = await supabase.from('pending_invites').delete().eq('id', inviteId).eq('owner_id', ownerId)
  if (error) return { success: false, error: error.message || 'Erro ao excluir convite.' }
  return { success: true }
}

export async function getAdminEmailsAction(
  ownerId: string,
  adminIds: string[]
): Promise<{ success: boolean; emails?: Record<string, string>; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Faça login para continuar.' }

  const effectiveOwner = await getEffectiveOwnerId(supabase, user.id)
  if (effectiveOwner !== user.id || ownerId !== user.id) return { success: false, error: 'Permissão negada.' }
  if (adminIds.length === 0) return { success: true, emails: {} }

  try {
    const admin = createAdminClient()
    const emails: Record<string, string> = {}
    for (const adminId of adminIds) {
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(adminId)
      if (!userError && userData?.user?.email) {
        emails[adminId] = userData.user.email
      }
    }
    return { success: true, emails }
  } catch {
    return { success: false, error: 'Erro ao buscar e-mails dos administradores.' }
  }
}
