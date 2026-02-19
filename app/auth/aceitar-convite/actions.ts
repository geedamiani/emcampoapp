'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getInviteByToken(token: string): Promise<{
  success: boolean
  invite?: { owner_id: string; email: string; team_name: string | null }
  error?: string
}> {
  if (!token?.trim()) {
    return { success: false, error: 'Token inválido' }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('pending_invites')
      .select('owner_id, email, team_name')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return { success: false, error: 'Convite expirado ou inválido.' }
    }

    return { success: true, invite: data }
  } catch {
    return { success: false, error: 'Erro ao validar convite.' }
  }
}

/** Accept invite for the currently logged-in user. Uses admin client to bypass RLS. */
export async function acceptInviteAction(token: string): Promise<{
  success: boolean
  teamName?: string
  error?: string
}> {
  if (!token?.trim()) {
    return { success: false, error: 'Token inválido' }
  }

  try {
    const serverSupabase = await createClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Faça login para aceitar o convite.' }
    }

    const admin = createAdminClient()
    const { data: invite, error: inviteError } = await admin
      .from('pending_invites')
      .select('owner_id, email, team_name')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return { success: false, error: 'Convite expirado ou inválido.' }
    }

    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return { success: false, error: `Este convite foi enviado para ${invite.email}.` }
    }

    const { error: insertError } = await admin.from('team_admins').insert({
      owner_id: invite.owner_id,
      admin_id: user.id,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        // Already admin
        await admin.from('pending_invites').delete().eq('token', token)
        return { success: true, teamName: invite.team_name || 'Meu Time' }
      }
      return { success: false, error: 'Erro ao aceitar convite.' }
    }

    await admin.from('pending_invites').delete().eq('token', token)
    return { success: true, teamName: invite.team_name || 'Meu Time' }
  } catch {
    return { success: false, error: 'Erro ao aceitar convite.' }
  }
}
